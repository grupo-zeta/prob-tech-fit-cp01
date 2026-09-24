# Spec-Kit: VisuTEA

## Visão Geral
Sistema de visão computacional passiva para detecção de biomarcadores em sala de aula.

## Arquitetura
- Frontend: Vanilla JS + MediaPipe FaceMesh
- Backend: Flask Python
- Pipeline: Câmera -> Landmarks -> Heurísticas (Gaze/Stimming) -> Alertas
