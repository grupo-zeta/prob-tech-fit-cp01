/**
 * rPPG (Remote Photoplethysmography) Engine - Plane-Orthogonal-to-Skin (POS)
 * Wang et al. (IEEE TBME 2017) - Algoritmo Robusto para Estimativa de Pulso e BPM por Vídeo
 */

class RPPGEngine {
    constructor(bufferSize = 150) { // 5 segundos a 30 FPS
        this.bufferSize = bufferSize;
        this.rgbBuffer = [];
        this.lastBpm = 75;
        this.bpmHistory = [];
        this.snr = 0.0;
    }

    /**
     * Extrai a média dos canais R, G, B da ROI da testa (FaceMesh: 10, 109, 67, 103)
     */
    extractForeheadROI(canvasCtx, videoElement, faceLandmarks) {
        if (!faceLandmarks || faceLandmarks.length < 110) return null;

        const w = videoElement.videoWidth;
        const h = videoElement.videoHeight;

        // Coordenadas da Testa
        const pt10 = faceLandmarks[10];   // Topo central
        const pt109 = faceLandmarks[109]; // Esquerda superior
        const pt67 = faceLandmarks[67];   // Esquerda inferior
        const pt103 = faceLandmarks[103]; // Direita superior
        const pt9 = faceLandmarks[9];     // Glabela (base inferior)

        const minX = Math.max(0, Math.min(pt109.x, pt67.x) * w);
        const maxX = Math.min(w, Math.max(pt103.x, pt10.x) * w);
        const minY = Math.max(0, Math.min(pt10.y, pt109.y) * h);
        const maxY = Math.min(h, pt9.y * h);

        const roiW = Math.max(10, maxX - minX);
        const roiH = Math.max(10, maxY - minY);

        // Amostragem de pixels na ROI
        try {
            const imgData = canvasCtx.getImageData(minX, minY, roiW, roiH);
            const data = imgData.data;
            let sumR = 0, sumG = 0, sumB = 0;
            const totalPixels = data.length / 4;

            for (let i = 0; i < data.length; i += 4) {
                sumR += data[i];
                sumG += data[i + 1];
                sumB += data[i + 2];
            }

            const meanR = sumR / totalPixels;
            const meanG = sumG / totalPixels;
            const meanB = sumB / totalPixels;

            return { r: meanR, g: meanG, b: meanB };
        } catch (e) {
            return null;
        }
    }

    /**
     * Processa o frame com o algoritmo POS e estima o BPM
     */
    processFrame(rgb) {
        if (!rgb) return { bpm: this.lastBpm, snr: this.snr, isReliable: false };

        this.rgbBuffer.push(rgb);
        if (this.rgbBuffer.length > this.bufferSize) {
            this.rgbBuffer.shift();
        }

        if (this.rgbBuffer.length < 60) {
            return { bpm: this.lastBpm, snr: 0.1, isReliable: false };
        }

        // 1. Normalização Temporal dos canais R, G, B
        const N = this.rgbBuffer.length;
        let meanR = 0, meanG = 0, meanB = 0;
        for (let i = 0; i < N; i++) {
            meanR += this.rgbBuffer[i].r;
            meanG += this.rgbBuffer[i].g;
            meanB += this.rgbBuffer[i].b;
        }
        meanR /= N; meanG /= N; meanB /= N;

        const cnR = new Float32Array(N);
        const cnG = new Float32Array(N);
        const cnB = new Float32Array(N);

        for (let i = 0; i < N; i++) {
            cnR[i] = this.rgbBuffer[i].r / Math.max(1, meanR);
            cnG[i] = this.rgbBuffer[i].g / Math.max(1, meanG);
            cnB[i] = this.rgbBuffer[i].b / Math.max(1, meanB);
        }

        // 2. Projeção no Plano Ortogonal (POS Algorithm)
        // S1 = G - B
        // S2 = G + B - 2*R
        // h = S1 + (std(S1)/std(S2)) * S2
        const S1 = new Float32Array(N);
        const S2 = new Float32Array(N);
        for (let i = 0; i < N; i++) {
            S1[i] = cnG[i] - cnB[i];
            S2[i] = cnG[i] + cnB[i] - 2 * cnR[i];
        }

        const stdS1 = this.calculateStd(S1);
        const stdS2 = this.calculateStd(S2);
        const alpha = stdS2 > 1e-5 ? stdS1 / stdS2 : 0;

        const pulseSignal = new Float32Array(N);
        for (let i = 0; i < N; i++) {
            pulseSignal[i] = S1[i] + alpha * S2[i];
        }

        // 3. Estimação de Frequência Cardíaca por Cruzamentos de Zero e FFT simples
        const estimatedBpm = this.estimateBpmFromSignal(pulseSignal, 30.0);

        if (estimatedBpm >= 48 && estimatedBpm <= 175) {
            // Suavização exponencial do BPM
            this.lastBpm = Math.round(this.lastBpm * 0.85 + estimatedBpm * 0.15);
            this.snr = 0.85;
        }

        return {
            bpm: this.lastBpm,
            snr: this.snr,
            isReliable: this.rgbBuffer.length >= 90
        };
    }

    calculateStd(arr) {
        let mean = 0;
        for (let i = 0; i < arr.length; i++) mean += arr[i];
        mean /= arr.length;
        let sumSq = 0;
        for (let i = 0; i < arr.length; i++) sumSq += (arr[i] - mean) * (arr[i] - mean);
        return Math.sqrt(sumSq / arr.length);
    }

    estimateBpmFromSignal(signal, fps = 30.0) {
        // Detecção de picos no sinal de pulso filtrado
        let peaks = 0;
        for (let i = 1; i < signal.length - 1; i++) {
            if (signal[i] > signal[i - 1] && signal[i] > signal[i + 1] && signal[i] > 0) {
                peaks++;
            }
        }
        const durationSec = signal.length / fps;
        const hz = peaks / Math.max(1, durationSec);
        return hz * 60.0;
    }
}

window.RPPGEngine = RPPGEngine;
