param(
    [int]$Port = 8765,
    [string]$CaptureDir = ''
)

$ErrorActionPreference = 'SilentlyContinue'

$mutexCreated = $false
$mutex = New-Object System.Threading.Mutex($true, "Local\CompassoTray_$Port", [ref]$mutexCreated)
if (-not $mutexCreated -and -not $CaptureDir) { return }

Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase, System.Windows.Forms, System.Drawing
Add-Type -AssemblyName System.Net.Http

$baseUrl = "http://127.0.0.1:$Port"
$dataRoot = Join-Path $env:LOCALAPPDATA 'Compasso'
$posFile = Join-Path $dataRoot 'widget-pos.json'
$browserProfile = Join-Path $dataRoot 'browser'
$nativeDll = Join-Path $dataRoot 'CompassoHudNative_v1.dll'

$nativeCode = @"
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class CompassoHudNative {
    public delegate bool EnumWindowsProc(IntPtr hwnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowTextW(IntPtr hwnd, StringBuilder text, int count);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetClassNameW(IntPtr hwnd, StringBuilder cls, int count);
    [DllImport("user32.dll")] public static extern int GetWindowLongW(IntPtr hwnd, int nIndex);
    [DllImport("user32.dll")] public static extern int SetWindowLongW(IntPtr hwnd, int nIndex, int dwNewLong);
    [DllImport("user32.dll")] public static extern bool SetLayeredWindowAttributes(IntPtr hwnd, uint crKey, byte bAlpha, uint dwFlags);
    [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hwnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hwnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern bool PostMessageW(IntPtr hwnd, uint Msg, IntPtr wParam, IntPtr lParam);

    public struct HudWin {
        public IntPtr Hwnd;
        public string Title;
        public int ExStyle;
    }

    public static List<HudWin> FindCompassoHudWindows() {
        var list = new List<HudWin>();
        EnumWindows((h, l) => {
            var cls = new StringBuilder(64);
            GetClassNameW(h, cls, 64);
            if (!cls.ToString().StartsWith("Chrome_WidgetWin")) return true;
            var sb = new StringBuilder(256);
            GetWindowTextW(h, sb, 256);
            string title = sb.ToString();
            if (title == "Compasso \u2022 Widget" || title == "Compasso \u2022 Painel" || title == "Compasso \u2022 Login") {
                list.Add(new HudWin { Hwnd = h, Title = title, ExStyle = GetWindowLongW(h, -20) });
            }
            return true;
        }, IntPtr.Zero);
        return list;
    }

    public static void HideBackgroundHud(IntPtr hwnd) {
        if (hwnd == IntPtr.Zero || !IsWindow(hwnd)) return;
        int ex = GetWindowLongW(hwnd, -20);
        int desired = (ex | 0x00080000 | 0x00000080 | 0x00000020 | 0x08000000) & ~0x00040000;
        if (ex != desired) SetWindowLongW(hwnd, -20, desired);
        SetLayeredWindowAttributes(hwnd, 0, 0, 0x2);
        SetWindowPos(hwnd, new IntPtr(1), 0, 0, 0, 0, 0x0001 | 0x0002 | 0x0010 | 0x0020);
    }

    public static void RestoreForegroundHud(IntPtr hwnd) {
        if (hwnd == IntPtr.Zero || !IsWindow(hwnd)) return;
        int ex = GetWindowLongW(hwnd, -20);
        int desired = (ex | 0x00040000) & ~(0x00000080 | 0x00000020 | 0x08000000 | 0x00080000);
        if (ex != desired) {
            SetWindowLongW(hwnd, -20, desired);
            SetWindowPos(hwnd, IntPtr.Zero, 0, 0, 0, 0, 0x0001 | 0x0002 | 0x0020 | 0x0040);
        }
        ShowWindow(hwnd, 9);
        SetForegroundWindow(hwnd);
    }

    public static void CloseHud(IntPtr hwnd) {
        if (hwnd != IntPtr.Zero && IsWindow(hwnd)) {
            PostMessageW(hwnd, 0x0010, IntPtr.Zero, IntPtr.Zero);
        }
    }
}
"@

if (Test-Path $nativeDll) {
    try { Add-Type -Path $nativeDll } catch { Add-Type -TypeDefinition $nativeCode }
} else {
    try {
        if (-not (Test-Path $dataRoot)) { New-Item -ItemType Directory -Path $dataRoot -Force | Out-Null }
        Add-Type -TypeDefinition $nativeCode -OutputAssembly $nativeDll
        Add-Type -Path $nativeDll
    } catch {
        Add-Type -TypeDefinition $nativeCode
    }
}

function U([string]$s) { [Regex]::Unescape($s) }

$http = New-Object System.Net.Http.HttpClient
$http.Timeout = [TimeSpan]::FromMilliseconds(450)

$script:lastToken = ''
$script:latestState = $null
$script:handsSession = $false
$script:userHidWidget = $false
$script:autoHidForPanel = $false
$script:isHovered = $false
$script:isClosing = $false
$script:hiddenHudHwnd = [IntPtr]::Zero
$script:seenBackend = $false
$script:failTicks = 0

function Find-EdgeExe {
    $candidates = @(
        (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),
        (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe')
    )
    foreach ($c in $candidates) {
        if ($c -and (Test-Path $c)) { return $c }
    }
    return $null
}

function Invoke-CompassoPost([string]$Action, [string]$Body = '{}') {
    try {
        if (-not $script:lastToken) {
            $raw = $http.GetStringAsync("$baseUrl/api/state").GetAwaiter().GetResult()
            $st = $raw | ConvertFrom-Json
            if ($st.token) { $script:lastToken = $st.token }
        }
        if (-not $script:lastToken) { return $null }
        $req = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Post, "$baseUrl/api/$Action")
        $req.Headers.TryAddWithoutValidation('X-Compasso-Token', $script:lastToken) | Out-Null
        $req.Content = New-Object System.Net.Http.StringContent($Body, [Text.Encoding]::UTF8, 'application/json')
        $resp = $http.SendAsync($req).GetAwaiter().GetResult()
        $txt = $resp.Content.ReadAsStringAsync().GetAwaiter().GetResult()
        if ($txt) { return ($txt | ConvertFrom-Json) }
    } catch {}
    return $null
}

[xml]$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="CompassoWidget" Width="256" Height="274"
        WindowStyle="None" AllowsTransparency="True" Background="{x:Null}"
        Topmost="True" ShowInTaskbar="False" ResizeMode="NoResize">
  <Window.Resources>
    <Style x:Key="CircleIconBtn" TargetType="Button">
      <Setter Property="Width" Value="26"/>
      <Setter Property="Height" Value="26"/>
      <Setter Property="Foreground" Value="#E5E7EB"/>
      <Setter Property="FontSize" Value="11"/>
      <Setter Property="FontWeight" Value="SemiBold"/>
      <Setter Property="Cursor" Value="Hand"/>
      <Setter Property="Template">
        <Setter.Value>
          <ControlTemplate TargetType="Button">
            <Border x:Name="Bd" CornerRadius="13" Background="#DC161B24" BorderBrush="#38FFFFFF" BorderThickness="1">
              <Border.Effect>
                <DropShadowEffect BlurRadius="8" ShadowDepth="2" Opacity="0.45" Color="Black"/>
              </Border.Effect>
              <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
            </Border>
            <ControlTemplate.Triggers>
              <Trigger Property="IsMouseOver" Value="True">
                <Setter TargetName="Bd" Property="Background" Value="#F97316"/>
                <Setter TargetName="Bd" Property="BorderBrush" Value="#FB923C"/>
                <Setter Property="Foreground" Value="#FFFFFF"/>
              </Trigger>
            </ControlTemplate.Triggers>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>
    <Style x:Key="CloseIconBtn" TargetType="Button">
      <Setter Property="Width" Value="26"/>
      <Setter Property="Height" Value="26"/>
      <Setter Property="Foreground" Value="#FCA5A5"/>
      <Setter Property="FontSize" Value="11"/>
      <Setter Property="FontWeight" Value="Bold"/>
      <Setter Property="Cursor" Value="Hand"/>
      <Setter Property="Template">
        <Setter.Value>
          <ControlTemplate TargetType="Button">
            <Border x:Name="Bd" CornerRadius="13" Background="#DC1A161C" BorderBrush="#50F87171" BorderThickness="1">
              <Border.Effect>
                <DropShadowEffect BlurRadius="8" ShadowDepth="2" Opacity="0.45" Color="Black"/>
              </Border.Effect>
              <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
            </Border>
            <ControlTemplate.Triggers>
              <Trigger Property="IsMouseOver" Value="True">
                <Setter TargetName="Bd" Property="Background" Value="#EF4444"/>
                <Setter TargetName="Bd" Property="BorderBrush" Value="#FCA5A5"/>
                <Setter Property="Foreground" Value="#FFFFFF"/>
              </Trigger>
            </ControlTemplate.Triggers>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>
    <Style x:Key="DockPillBtn" TargetType="Button">
      <Setter Property="Foreground" Value="#CBD5E1"/>
      <Setter Property="FontSize" Value="10"/>
      <Setter Property="FontWeight" Value="SemiBold"/>
      <Setter Property="Padding" Value="7,4"/>
      <Setter Property="Cursor" Value="Hand"/>
      <Setter Property="Template">
        <Setter.Value>
          <ControlTemplate TargetType="Button">
            <Border x:Name="Bd" CornerRadius="10" Background="Transparent" Padding="{TemplateBinding Padding}">
              <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
            </Border>
            <ControlTemplate.Triggers>
              <Trigger Property="IsMouseOver" Value="True">
                <Setter TargetName="Bd" Property="Background" Value="#26FFFFFF"/>
                <Setter Property="Foreground" Value="#FFFFFF"/>
              </Trigger>
              <Trigger Property="IsEnabled" Value="False">
                <Setter Property="Opacity" Value="0.38"/>
              </Trigger>
            </ControlTemplate.Triggers>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>
  </Window.Resources>

  <Canvas x:Name="WidgetRoot" Width="256" Height="274" Opacity="0.74">
    <Border x:Name="HoverBridge" Canvas.Left="6" Canvas.Top="2" Width="244" Height="268" CornerRadius="24"
            Background="#01000000" Visibility="Collapsed"/>

    <!-- Relógio Circular Translúcido -->
    <Grid x:Name="DialShell" Canvas.Left="28" Canvas.Top="10" Width="184" Height="184" Cursor="SizeAll">
      <Grid.Effect>
        <DropShadowEffect BlurRadius="16" ShadowDepth="4" Opacity="0.48" Color="Black"/>
      </Grid.Effect>

      <Ellipse Stroke="#984B5565" StrokeThickness="1.4">
        <Ellipse.Fill>
          <LinearGradientBrush StartPoint="0,0" EndPoint="1,1">
            <GradientStop Color="#CC3B4352" Offset="0"/>
            <GradientStop Color="#D61C222B" Offset="0.5"/>
            <GradientStop Color="#E00B0D12" Offset="1"/>
          </LinearGradientBrush>
        </Ellipse.Fill>
      </Ellipse>

      <Ellipse Margin="6" Stroke="#882E3644" StrokeThickness="1">
        <Ellipse.Fill>
          <RadialGradientBrush Center="0.5,0.4" GradientOrigin="0.5,0.4" RadiusX="0.62" RadiusY="0.62">
            <GradientStop Color="#CE1E2430" Offset="0"/>
            <GradientStop Color="#D80F1319" Offset="0.7"/>
            <GradientStop Color="#E307090C" Offset="1"/>
          </RadialGradientBrush>
        </Ellipse.Fill>
      </Ellipse>

      <Ellipse Margin="10" Stroke="#12FFFFFF" StrokeThickness="2" Fill="Transparent"/>
      <Path x:Name="ProgressArc" Stroke="#F97316" StrokeThickness="2.5" StrokeStartLineCap="Round" StrokeEndLineCap="Round"/>
      <Canvas x:Name="TicksCanvas" Width="184" Height="184"/>

      <!-- Reflexo sutil no vidro -->
      <Path Data="M 26,68 A 74,64 0 0 1 158,68 A 82,48 0 0 0 26,68 Z" Opacity="0.16" IsHitTestVisible="False">
        <Path.Fill>
          <LinearGradientBrush StartPoint="0.5,0" EndPoint="0.5,1">
            <GradientStop Color="#FFFFFFFF" Offset="0"/>
            <GradientStop Color="#00FFFFFF" Offset="1"/>
          </LinearGradientBrush>
        </Path.Fill>
      </Path>

      <!-- Números Cardinais -->
      <TextBlock Text="12" Foreground="#E5E7EB" FontSize="12.5" FontWeight="Bold" HorizontalAlignment="Center" VerticalAlignment="Top" Margin="0,19,0,0" IsHitTestVisible="False"/>
      <TextBlock Text="6" Foreground="#E5E7EB" FontSize="12.5" FontWeight="Bold" HorizontalAlignment="Center" VerticalAlignment="Bottom" Margin="0,0,0,17" IsHitTestVisible="False"/>
      <TextBlock Text="9" Foreground="#E5E7EB" FontSize="12.5" FontWeight="Bold" HorizontalAlignment="Left" VerticalAlignment="Center" Margin="20,0,0,0" IsHitTestVisible="False"/>
      <TextBlock Text="3" Foreground="#E5E7EB" FontSize="12.5" FontWeight="Bold" HorizontalAlignment="Right" VerticalAlignment="Center" Margin="0,0,20,0" IsHitTestVisible="False"/>

      <!-- Sub-rótulo Superior -->
      <StackPanel HorizontalAlignment="Center" VerticalAlignment="Top" Margin="0,42,0,0" IsHitTestVisible="False">
        <Grid Width="14" Height="14" HorizontalAlignment="Center" Margin="0,0,0,2">
          <Ellipse Stroke="#E5E7EB" StrokeThickness="1.3" Opacity="0.85"/>
          <Ellipse Margin="1.5" Stroke="#F97316" StrokeThickness="1.1" RenderTransformOrigin="0.5,0.5">
            <Ellipse.RenderTransform><RotateTransform Angle="-32"/></Ellipse.RenderTransform>
          </Ellipse>
          <Ellipse Width="3" Height="3" Fill="#F97316"/>
        </Grid>
        <TextBlock HorizontalAlignment="Center" FontSize="9.5" FontWeight="Bold">
          <Run Text="compasso" Foreground="#D1D5DB"/><Run Text="." Foreground="#F97316"/>
        </TextBlock>
        <TextBlock x:Name="DialSubMode" Text="HORA LOCAL" Foreground="#9CA3AF" FontSize="6.5" FontWeight="SemiBold" HorizontalAlignment="Center"/>
      </StackPanel>

      <!-- Sub-rótulo Inferior (sem caixa) -->
      <StackPanel HorizontalAlignment="Center" VerticalAlignment="Bottom" Margin="0,0,0,34" IsHitTestVisible="False">
        <TextBlock x:Name="DialDigital" Text="--:--" Foreground="#A5AEBB" FontFamily="Consolas, Segoe UI" FontSize="10.5" FontWeight="SemiBold" HorizontalAlignment="Center"/>
        <TextBlock x:Name="DialStatus" Text="IA ATIVA" Foreground="#FB923C" FontFamily="Consolas, Segoe UI" FontSize="7" FontWeight="Bold" HorizontalAlignment="Center"/>
      </StackPanel>

      <!-- Ponteiros -->
      <Line x:Name="HourHand" X1="92" Y1="99" X2="92" Y2="53" Stroke="#E5E7EB" StrokeThickness="3.8" StrokeStartLineCap="Round" StrokeEndLineCap="Round" IsHitTestVisible="False">
        <Line.RenderTransform><RotateTransform x:Name="HourRot" CenterX="92" CenterY="92" Angle="0"/></Line.RenderTransform>
      </Line>
      <Line x:Name="MinHand" X1="92" Y1="103" X2="92" Y2="36" Stroke="#F3F4F6" StrokeThickness="2.6" StrokeStartLineCap="Round" StrokeEndLineCap="Round" IsHitTestVisible="False">
        <Line.RenderTransform><RotateTransform x:Name="MinRot" CenterX="92" CenterY="92" Angle="0"/></Line.RenderTransform>
      </Line>
      <Line x:Name="SecHand" X1="92" Y1="108" X2="92" Y2="28" Stroke="#F97316" StrokeThickness="1.4" StrokeStartLineCap="Round" StrokeEndLineCap="Round" IsHitTestVisible="False">
        <Line.RenderTransform><RotateTransform x:Name="SecRot" CenterX="92" CenterY="92" Angle="0"/></Line.RenderTransform>
      </Line>

      <Ellipse Width="10" Height="10" Fill="#262C37" Stroke="#E5E7EB" StrokeThickness="1.3" HorizontalAlignment="Center" VerticalAlignment="Center" IsHitTestVisible="False"/>
      <Ellipse Width="4" Height="4" Fill="#F97316" HorizontalAlignment="Center" VerticalAlignment="Center" IsHitTestVisible="False"/>
    </Grid>

    <!-- Controles exibidos somente ao passar o mouse -->
    <Canvas x:Name="HoverControls" Width="256" Height="274" Opacity="0" IsHitTestVisible="False">
      <Button x:Name="BtnHideWidget" Canvas.Left="194" Canvas.Top="21" Style="{StaticResource CloseIconBtn}" Content="&#x2715;" ToolTip="Tirar rel&#x00F3;gio da tela (continua na bandeja)"/>
      <Button x:Name="BtnOpenPanel" Canvas.Left="214" Canvas.Top="62" Style="{StaticResource CircleIconBtn}" Content="&#x2197;" ToolTip="Abrir Painel Completo"/>
      <Button x:Name="BtnToggleHands" Canvas.Left="215" Canvas.Top="108" Style="{StaticResource CircleIconBtn}" Content="&#x21C4;" ToolTip="Alternar ponteiros: Hora Local / Sess&#x00E3;o"/>

      <StackPanel Canvas.Left="6" Canvas.Top="199" Width="244" HorizontalAlignment="Center">
        <Border HorizontalAlignment="Center" CornerRadius="10" Background="#CC10141C" BorderBrush="#22FFFFFF" BorderThickness="1" Padding="9,3" Margin="0,0,0,5">
          <StackPanel Orientation="Horizontal" HorizontalAlignment="Center">
            <Ellipse x:Name="WhisperDot" Width="6" Height="6" Fill="#10B981" VerticalAlignment="Center" Margin="0,0,6,0"/>
            <TextBlock x:Name="HoverWhisper" Text="Observa&#x00E7;&#x00E3;o silenciosa" Foreground="#E5E7EB" FontSize="10" FontWeight="SemiBold"/>
          </StackPanel>
        </Border>
        <Border HorizontalAlignment="Center" CornerRadius="14" Background="#E6131822" BorderBrush="#33FFFFFF" BorderThickness="1" Padding="4,2">
          <Border.Effect>
            <DropShadowEffect BlurRadius="10" ShadowDepth="2" Opacity="0.45" Color="Black"/>
          </Border.Effect>
          <StackPanel Orientation="Horizontal" HorizontalAlignment="Center">
            <Button x:Name="BtnTogglePause" Style="{StaticResource DockPillBtn}" Content="Pausar"/>
            <Button x:Name="BtnFinish" Style="{StaticResource DockPillBtn}" Content="Salvar"/>
            <Button x:Name="BtnCancel" Style="{StaticResource DockPillBtn}" Content="Descartar" Foreground="#FCA5A5"/>
            <Button x:Name="BtnShutdown" Style="{StaticResource DockPillBtn}" Content="Encerrar" Foreground="#FDA4AF" ToolTip="Encerrar Compasso completamente"/>
          </StackPanel>
        </Border>
      </StackPanel>
    </Canvas>
  </Canvas>
</Window>
"@

$reader = New-Object System.Xml.XmlNodeReader $xaml
$win = [Windows.Markup.XamlReader]::Load($reader)

$WidgetRoot    = $win.FindName('WidgetRoot')
$HoverBridge   = $win.FindName('HoverBridge')
$DialShell     = $win.FindName('DialShell')
$TicksCanvas   = $win.FindName('TicksCanvas')
$ProgressArc   = $win.FindName('ProgressArc')
$HourRot       = $win.FindName('HourRot')
$MinRot        = $win.FindName('MinRot')
$SecRot        = $win.FindName('SecRot')
$DialSubMode   = $win.FindName('DialSubMode')
$DialDigital   = $win.FindName('DialDigital')
$DialStatus    = $win.FindName('DialStatus')
$HoverControls = $win.FindName('HoverControls')
$WhisperDot    = $win.FindName('WhisperDot')
$HoverWhisper  = $win.FindName('HoverWhisper')
$BtnHideWidget = $win.FindName('BtnHideWidget')
$BtnOpenPanel  = $win.FindName('BtnOpenPanel')
$BtnToggleHands= $win.FindName('BtnToggleHands')
$BtnTogglePause= $win.FindName('BtnTogglePause')
$BtnFinish     = $win.FindName('BtnFinish')
$BtnCancel     = $win.FindName('BtnCancel')
$BtnShutdown   = $win.FindName('BtnShutdown')

# Desenha os 60 marcadores do relógio
for ($i = 0; $i -lt 60; $i++) {
    if ($i % 15 -eq 0) { continue }
    $isHour = ($i % 5 -eq 0)
    $ang = ($i * 6 - 90) * [Math]::PI / 180.0
    $rOut = 74.0
    $rIn = if ($isHour) { 67.0 } else { 71.0 }
    $ln = New-Object System.Windows.Shapes.Line
    $ln.X1 = 92.0 + $rIn * [Math]::Cos($ang)
    $ln.Y1 = 92.0 + $rIn * [Math]::Sin($ang)
    $ln.X2 = 92.0 + $rOut * [Math]::Cos($ang)
    $ln.Y2 = 92.0 + $rOut * [Math]::Sin($ang)
    $ln.Stroke = if ($isHour) { [System.Windows.Media.BrushConverter]::new().ConvertFromString('#CBD5E1') } else { [System.Windows.Media.BrushConverter]::new().ConvertFromString('#4B5563') }
    $ln.StrokeThickness = if ($isHour) { 1.6 } else { 0.9 }
    $ln.StrokeStartLineCap = [System.Windows.Media.PenLineCap]::Round
    $ln.StrokeEndLineCap = [System.Windows.Media.PenLineCap]::Round
    $ln.IsHitTestVisible = $false
    $TicksCanvas.Children.Add($ln) | Out-Null
}

function Set-ProgressArc([double]$ratio) {
    $r = [Math]::Max(0.0, [Math]::Min(0.999, $ratio))
    if ($r -le 0.005) { $ProgressArc.Data = $null; return }
    $rad = 78.5
    $cx = 92.0; $cy = 92.0
    $sx = $cx; $sy = $cy - $rad
    $angleRad = ($r * 360.0 - 90.0) * [Math]::PI / 180.0
    $ex = $cx + $rad * [Math]::Cos($angleRad)
    $ey = $cy + $rad * [Math]::Sin($angleRad)
    $large = if ($r -gt 0.5) { 1 } else { 0 }
    $inv = [System.Globalization.CultureInfo]::InvariantCulture
    $geomStr = [string]::Format($inv, "M {0:F2},{1:F2} A {2:F2},{2:F2} 0 {3} 1 {4:F2},{5:F2}", $sx, $sy, $rad, $large, $ex, $ey)
    $ProgressArc.Data = [System.Windows.Media.Geometry]::Parse($geomStr)
}

function Load-WidgetPos {
    $wa = [System.Windows.SystemParameters]::WorkArea
    $defLeft = [Math]::Max($wa.Left + 8, $wa.Right - 256)
    $defTop  = [Math]::Max($wa.Top + 8,  $wa.Top + 14)
    if (Test-Path $posFile) {
        try {
            $p = Get-Content $posFile -Raw | ConvertFrom-Json
            if ($null -ne $p.left -and $null -ne $p.top) {
                $l = [Math]::Min([Math]::Max($wa.Left - 24, [double]$p.left), $wa.Right - 210)
                $t = [Math]::Min([Math]::Max($wa.Top - 6,  [double]$p.top),  $wa.Bottom - 205)
                $win.Left = $l; $win.Top = $t; return
            }
        } catch {}
    }
    $win.Left = $defLeft; $win.Top = $defTop
}

function Save-WidgetPos {
    try {
        if (-not (Test-Path $dataRoot)) { New-Item -ItemType Directory -Path $dataRoot -Force | Out-Null }
        @{ left = [Math]::Round($win.Left); top = [Math]::Round($win.Top) } | ConvertTo-Json -Compress | Set-Content $posFile -Encoding UTF8
    } catch {}
}

$hoverLeaveTimer = New-Object System.Windows.Threading.DispatcherTimer
$hoverLeaveTimer.Interval = [TimeSpan]::FromMilliseconds(160)

function Set-HoverState([bool]$on) {
    if ($script:isHovered -eq $on) { return }
    $script:isHovered = $on
    $HoverBridge.Visibility = if ($on) { [System.Windows.Visibility]::Visible } else { [System.Windows.Visibility]::Collapsed }
    $HoverControls.IsHitTestVisible = $on
    $dur = [System.Windows.Duration]::new([TimeSpan]::FromMilliseconds(160))
    $animRoot = New-Object System.Windows.Media.Animation.DoubleAnimation($(if ($on) { 0.97 } else { 0.74 }), $dur)
    $animCtrl = New-Object System.Windows.Media.Animation.DoubleAnimation($(if ($on) { 1.0 } else { 0.0 }), $dur)
    $WidgetRoot.BeginAnimation([System.Windows.UIElement]::OpacityProperty, $animRoot)
    $HoverControls.BeginAnimation([System.Windows.UIElement]::OpacityProperty, $animCtrl)
}

$hoverLeaveTimer.Add_Tick({
    $hoverLeaveTimer.Stop()
    if (-not $WidgetRoot.IsMouseOver) { Set-HoverState $false }
})

$WidgetRoot.Add_MouseEnter({
    $hoverLeaveTimer.Stop()
    Set-HoverState $true
})
$WidgetRoot.Add_MouseLeave({
    $hoverLeaveTimer.Stop()
    $hoverLeaveTimer.Start()
})

$DialShell.Add_MouseLeftButtonDown({
    if ($_.ClickCount -ge 2) {
        $script:handsSession = -not $script:handsSession
        Update-ClockDisplay
        $_.Handled = $true
        return
    }
    try {
        $win.DragMove()
        Save-WidgetPos
    } catch {}
})

function Update-ClockDisplay {
    $now = Get-Date
    $st = $script:latestState
    $active = $null -ne $st -and $null -ne $st.active
    $paused = $null -ne $st -and [bool]$st.paused
    $elapsed = if ($null -ne $st -and $null -ne $st.elapsed) { [double]$st.elapsed } else { 0.0 }
    $goal = if ($active -and $null -ne $st.active.goal) { [double]$st.active.goal } else { 0.0 }

    if ($script:handsSession) {
        $sec = $elapsed % 60.0
        $min = ($elapsed / 60.0) % 60.0
        $hr  = ($elapsed / 3600.0) % 12.0
        $SecRot.Angle = $sec * 6.0
        $MinRot.Angle = $min * 6.0
        $HourRot.Angle = $hr * 30.0
        $DialSubMode.Text = (U 'DURA\u00C7\u00C3O')
        $ts = [TimeSpan]::FromSeconds([Math]::Floor($elapsed))
        $DialDigital.Text = '{0:D2}:{1:D2}:{2:D2}' -f [int]$ts.TotalHours, $ts.Minutes, $ts.Seconds
    } else {
        $sec = $now.Second + ($now.Millisecond / 1000.0)
        $min = $now.Minute + ($sec / 60.0)
        $hr  = ($now.Hour % 12) + ($min / 60.0)
        $SecRot.Angle = $sec * 6.0
        $MinRot.Angle = $min * 6.0
        $HourRot.Angle = $hr * 30.0
        $DialSubMode.Text = 'HORA LOCAL'
        $DialDigital.Text = $now.ToString('HH:mm')
    }

    $bc = [System.Windows.Media.BrushConverter]::new()
    if (-not $active) {
        $DialStatus.Text = 'AGUARDANDO'
        $DialStatus.Foreground = $bc.ConvertFromString('#94A3B8')
        $BtnTogglePause.Content = 'Ativar'
        $BtnFinish.IsEnabled = $false
        $BtnCancel.IsEnabled = $false
        $HoverWhisper.Text = (U 'Pronto \u00B7 passe o mouse para a\u00E7\u00F5es')
        $WhisperDot.Fill = $bc.ConvertFromString('#94A3B8')
        Set-ProgressArc 0.0
    } elseif ($paused) {
        $DialStatus.Text = 'PAUSADA'
        $DialStatus.Foreground = $bc.ConvertFromString('#94A3B8')
        $BtnTogglePause.Content = 'Retomar'
        $BtnFinish.IsEnabled = $true
        $BtnCancel.IsEnabled = $true
        $HoverWhisper.Text = 'Monitoramento pausado'
        $WhisperDot.Fill = $bc.ConvertFromString('#F59E0B')
        $ratio = if ($goal -gt 0) { $elapsed / ($goal * 60.0) } else { (($elapsed / 60.0) % 60.0) / 60.0 }
        Set-ProgressArc $ratio
    } else {
        $DialStatus.Text = 'IA ATIVA'
        $DialStatus.Foreground = $bc.ConvertFromString('#FB923C')
        $BtnTogglePause.Content = 'Pausar'
        $BtnFinish.IsEnabled = $true
        $BtnCancel.IsEnabled = $true
        $appName = if ($st.live -and $st.live.app) { [string]$st.live.app } else { '' }
        $isSelf = (-not $appName) -or ($appName -match '^(msedge|chrome|brave|compasso|powershell|Windows / protegido)$')
        if ($st.live -and [double]$st.live.idle -ge 60) {
            $HoverWhisper.Text = 'Ausente do computador'
            $WhisperDot.Fill = $bc.ConvertFromString('#94A3B8')
        } elseif ($isSelf) {
            $HoverWhisper.Text = (U 'Observa\u00E7\u00E3o silenciosa')
            $WhisperDot.Fill = $bc.ConvertFromString('#10B981')
        } else {
            $shortApp = if ($appName.Length -gt 20) { $appName.Substring(0, 18) + '...' } else { $appName }
            $HoverWhisper.Text = (U "Em ritmo \u00B7 $shortApp")
            $WhisperDot.Fill = $bc.ConvertFromString('#10B981')
        }
        $ratio = if ($goal -gt 0) { $elapsed / ($goal * 60.0) } else { [Math]::Max(0.10, (($elapsed / 60.0) % 60.0) / 60.0) }
        Set-ProgressArc $ratio
    }
}

# Bandeja do Sistema (NotifyIcon)
$tray = New-Object System.Windows.Forms.NotifyIcon
$icoPath = Join-Path $PSScriptRoot 'compasso.ico'
if (Test-Path $icoPath) { $tray.Icon = New-Object System.Drawing.Icon $icoPath }
else { $tray.Icon = [System.Drawing.SystemIcons]::Application }
$tray.Text = 'Compasso'
$tray.Visible = (-not $CaptureDir)

$ctxMenu = New-Object System.Windows.Forms.ContextMenuStrip
$trayToggleWidgetItem = $ctxMenu.Items.Add((U 'Tirar Rel\u00F3gio da Tela'))
$trayOpenPanelItem = $ctxMenu.Items.Add('Abrir Painel Completo')
$trayPauseItem = $ctxMenu.Items.Add('Pausar / Retomar')
$ctxMenu.Items.Add('-') | Out-Null
$trayExitItem = $ctxMenu.Items.Add('Encerrar Compasso')
$tray.ContextMenuStrip = $ctxMenu

function Sync-TrayLabel {
    if ($win.IsVisible) {
        $trayToggleWidgetItem.Text = (U 'Tirar Rel\u00F3gio da Tela')
    } else {
        $trayToggleWidgetItem.Text = (U 'Mostrar Rel\u00F3gio Flutuante')
    }
}

function Hide-WidgetToTray([bool]$manual = $true) {
    if ($manual) { $script:userHidWidget = $true }
    Set-HoverState $false
    $win.Hide()
    Sync-TrayLabel
}

function Show-FloatingWidget {
    $script:userHidWidget = $false
    $script:autoHidForPanel = $false
    if (-not $win.IsVisible) { $win.Show() }
    Sync-TrayLabel
}

function Open-FullPanel {
    $script:userHidWidget = $false
    $huds = [CompassoHudNative]::FindCompassoHudWindows()
    $panelHud = $huds | Where-Object { $_.Title -eq (U 'Compasso \u2022 Painel') -or $_.Title -eq (U 'Compasso \u2022 Login') } | Select-Object -First 1
    if ($panelHud) {
        [CompassoHudNative]::RestoreForegroundHud($panelHud.Hwnd)
        return
    }
    $edgeExe = Find-EdgeExe
    $url = "$baseUrl/?panel=1"
    if ($edgeExe) {
        Start-Process -FilePath $edgeExe -ArgumentList @("--app=$url", "--window-size=1040,740", "--user-data-dir=$browserProfile") | Out-Null
    } else {
        Start-Process $url | Out-Null
    }
}

function Shutdown-Compasso {
    if ($script:isClosing) { return }
    $script:isClosing = $true
    Invoke-CompassoPost 'shutdown' | Out-Null
    try {
        foreach ($h in [CompassoHudNative]::FindCompassoHudWindows()) {
            [CompassoHudNative]::CloseHud($h.Hwnd)
        }
    } catch {}
    $tray.Visible = $false
    $tray.Dispose()
    try { $win.Close() } catch {}
    [System.Windows.Threading.Dispatcher]::CurrentDispatcher.BeginInvokeShutdown([System.Windows.Threading.DispatcherPriority]::Background)
}

# Eventos dos botões do Widget
$BtnHideWidget.Add_Click({ Hide-WidgetToTray $true })
$BtnOpenPanel.Add_Click({ Open-FullPanel })
$BtnToggleHands.Add_Click({ $script:handsSession = -not $script:handsSession; Update-ClockDisplay })
$BtnTogglePause.Add_Click({
    $active = $null -ne $script:latestState -and $null -ne $script:latestState.active
    if ($active) { Invoke-CompassoPost 'pause' | Out-Null }
    else { Invoke-CompassoPost 'start' '{"project":"Uso Cont\u00EDnuo (IA \u00B7 Autom\u00E1tico)","goal":0,"capture_enabled":true,"allow_ai_upload":false}' | Out-Null }
})
$BtnFinish.Add_Click({ Invoke-CompassoPost 'finish' | Out-Null })
$BtnCancel.Add_Click({
    $ans = [System.Windows.Forms.MessageBox]::Show(
        (U 'Descartar a sess\u00E3o atual e apagar seus registros deste bloco?'),
        'Compasso',
        [System.Windows.Forms.MessageBoxButtons]::YesNo,
        [System.Windows.Forms.MessageBoxIcon]::Question
    )
    if ($ans -eq [System.Windows.Forms.DialogResult]::Yes) {
        Invoke-CompassoPost 'cancel' | Out-Null
    }
})
$BtnShutdown.Add_Click({ Shutdown-Compasso })

# Menu de contexto no próprio relógio (botão direito)
$wpfMenu = New-Object System.Windows.Controls.ContextMenu
$mOpen = New-Object System.Windows.Controls.MenuItem; $mOpen.Header = 'Abrir Painel Completo'; $mOpen.Add_Click({ Open-FullPanel })
$mMode = New-Object System.Windows.Controls.MenuItem; $mMode.Header = (U 'Alternar Hora Local / Sess\u00E3o'); $mMode.Add_Click({ $script:handsSession = -not $script:handsSession; Update-ClockDisplay })
$mPause = New-Object System.Windows.Controls.MenuItem; $mPause.Header = 'Pausar / Retomar Monitoramento'; $mPause.Add_Click({ Invoke-CompassoPost 'pause' | Out-Null })
$mHide = New-Object System.Windows.Controls.MenuItem; $mHide.Header = (U 'Tirar Rel\u00F3gio da Tela (Bandeja)'); $mHide.Add_Click({ Hide-WidgetToTray $true })
$mExit = New-Object System.Windows.Controls.MenuItem; $mExit.Header = 'Encerrar Compasso'; $mExit.Add_Click({ Shutdown-Compasso })
$wpfMenu.Items.Add($mOpen) | Out-Null
$wpfMenu.Items.Add($mMode) | Out-Null
$wpfMenu.Items.Add($mPause) | Out-Null
$wpfMenu.Items.Add((New-Object System.Windows.Controls.Separator)) | Out-Null
$wpfMenu.Items.Add($mHide) | Out-Null
$wpfMenu.Items.Add($mExit) | Out-Null
$DialShell.ContextMenu = $wpfMenu

# Eventos da Bandeja
$trayToggleWidgetItem.Add_Click({ if ($win.IsVisible) { Hide-WidgetToTray $true } else { Show-FloatingWidget } })
$trayOpenPanelItem.Add_Click({ Open-FullPanel })
$trayPauseItem.Add_Click({ Invoke-CompassoPost 'pause' | Out-Null })
$trayExitItem.Add_Click({ Shutdown-Compasso })
$tray.Add_DoubleClick({
    if ($win.IsVisible) { Open-FullPanel } else { Show-FloatingWidget }
})

# Timers de Relógio (250ms) e Sincronização Edge/Backend (180ms inicial -> 450ms)
$clockTimer = New-Object System.Windows.Threading.DispatcherTimer
$clockTimer.Interval = [TimeSpan]::FromMilliseconds(250)
$clockTimer.Add_Tick({ Update-ClockDisplay })

$syncTimer = New-Object System.Windows.Threading.DispatcherTimer
$syncTimer.Interval = [TimeSpan]::FromMilliseconds(150)
$script:bootCycles = 0
$syncTimer.Add_Tick({
    if ($script:isClosing) { return }
    $script:bootCycles++
    if ($script:bootCycles -eq 40) { $syncTimer.Interval = [TimeSpan]::FromMilliseconds(450) }

    # 1. Consulta estado do backend local
    try {
        $raw = $http.GetStringAsync("$baseUrl/api/state").GetAwaiter().GetResult()
        $st = $raw | ConvertFrom-Json
        $script:latestState = $st
        if ($st.token) { $script:lastToken = $st.token }
        $script:seenBackend = $true
        $script:failTicks = 0
    } catch {
        $script:failTicks++
        if ($script:seenBackend -and $script:failTicks -ge 3) {
            Shutdown-Compasso
            return
        }
    }

    # 2. Sincroniza janela do Edge HUD com o Widget Flutuante Nativo
    if (-not $CaptureDir) {
        $huds = [CompassoHudNative]::FindCompassoHudWindows()
        $hasPanelOrLogin = $false
        foreach ($h in $huds) {
            if ($h.Title -eq (U 'Compasso \u2022 Painel') -or $h.Title -eq (U 'Compasso \u2022 Login')) {
                $hasPanelOrLogin = $true
                if (($h.ExStyle -band 0x00080080) -ne 0) {
                    [CompassoHudNative]::RestoreForegroundHud($h.Hwnd) | Out-Null
                }
            }
        }
        foreach ($h in $huds) {
            if ($h.Title -eq (U 'Compasso \u2022 Widget')) {
                if ($hasPanelOrLogin) {
                    [CompassoHudNative]::CloseHud($h.Hwnd) | Out-Null
                } else {
                    $script:hiddenHudHwnd = $h.Hwnd
                    [CompassoHudNative]::HideBackgroundHud($h.Hwnd) | Out-Null
                }
            }
        }
        if ($hasPanelOrLogin) {
            if ($win.IsVisible) {
                $script:autoHidForPanel = $true
                Set-HoverState $false
                $win.Hide()
                Sync-TrayLabel
            }
        } elseif ($script:autoHidForPanel -and -not $script:userHidWidget) {
            $script:autoHidForPanel = $false
            Show-FloatingWidget
        }
    }
})

Load-WidgetPos
Update-ClockDisplay
$win.Show()
Sync-TrayLabel
$clockTimer.Start()
$syncTimer.Start()

if ($CaptureDir) {
    if (-not (Test-Path $CaptureDir)) { New-Item -ItemType Directory -Path $CaptureDir -Force | Out-Null }
    $capTimer = New-Object System.Windows.Threading.DispatcherTimer
    $capTimer.Interval = [TimeSpan]::FromMilliseconds(900)
    $capTimer.Add_Tick({
        $capTimer.Stop()
        Update-ClockDisplay
        $win.Dispatcher.Invoke([Action]{}, [System.Windows.Threading.DispatcherPriority]::Render)
        $rtb1 = New-Object System.Windows.Media.Imaging.RenderTargetBitmap(256, 274, 96, 96, [System.Windows.Media.PixelFormats]::Pbgra32)
        $rtb1.Render($win.Content)
        $e1 = New-Object System.Windows.Media.Imaging.PngBitmapEncoder
        $e1.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($rtb1))
        $f1 = [IO.File]::OpenWrite((Join-Path $CaptureDir 'wpf_widget_rest.png'))
        $e1.Save($f1); $f1.Close()

        Set-HoverState $true
        $WidgetRoot.BeginAnimation([System.Windows.UIElement]::OpacityProperty, $null)
        $HoverControls.BeginAnimation([System.Windows.UIElement]::OpacityProperty, $null)
        $WidgetRoot.Opacity = 0.97
        $HoverControls.Opacity = 1.0
        $HoverControls.IsHitTestVisible = $true
        $win.Dispatcher.Invoke([Action]{}, [System.Windows.Threading.DispatcherPriority]::Render)
        $rtb2 = New-Object System.Windows.Media.Imaging.RenderTargetBitmap(256, 274, 96, 96, [System.Windows.Media.PixelFormats]::Pbgra32)
        $rtb2.Render($win.Content)
        $e2 = New-Object System.Windows.Media.Imaging.PngBitmapEncoder
        $e2.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($rtb2))
        $f2 = [IO.File]::OpenWrite((Join-Path $CaptureDir 'wpf_widget_hover.png'))
        $e2.Save($f2); $f2.Close()

        $info = @{
            restOpacity = [Math]::Round($WidgetRoot.Opacity, 2)
            dialStatus = $DialStatus.Text
            hoverWhisper = $HoverWhisper.Text
            hideBtnVisible = ($HoverControls.IsHitTestVisible)
            dockWidth = [Math]::Round($HoverControls.ActualWidth)
            dockHeight = [Math]::Round($HoverControls.ActualHeight)
        } | ConvertTo-Json -Compress
        Write-Output "WPF_CAPTURE=$info"

        $script:isClosing = $true
        $tray.Visible = $false
        $tray.Dispose()
        $win.Close()
        [System.Windows.Threading.Dispatcher]::CurrentDispatcher.BeginInvokeShutdown([System.Windows.Threading.DispatcherPriority]::Background)
    })
    $capTimer.Start()
}

$app = New-Object System.Windows.Application
$app.ShutdownMode = [System.Windows.ShutdownMode]::OnExplicitShutdown
$app.Run() | Out-Null
$clockTimer.Stop()
$syncTimer.Stop()
if ($tray) { $tray.Visible = $false; $tray.Dispose() }
if ($mutex) { try { $mutex.ReleaseMutex() } catch {}; $mutex.Dispose() }
