/**
 * TEA Advanced Clinical & Behavioral Engine
 * Multimodal: Pose 3D + FaceMesh (FACS AUs) + Áudio dB + rPPG Pulso + Métricas ABA
 */

class StimmingDetector {
    constructor() {
        this.historySize = 60;
        this.poseHistory = [];
        this.faceHistory = [];
        this.timelineHistory = [];

        // Estados Temporais & Latência Sensorial
        this.lastNoiseSpikeTime = null;
        this.earCoverStartTime = null;
        this.faceHideStartTime = null;
        this.freezeStartTime = null;
        this.facialTensionStartTime = null;
        this.sessionStartTime = Date.now();
        this.lastEventTimes = {};
        this.cooldownMs = 3500;

        // Histórico Clínico & Contadores ABA
        this.clinicalIncidentLog = [];
        this.behaviorCounts = {
            hand_flapping: 0,
            body_rocking: 0,
            sensory_auditory: 0,
            sensory_visual: 0,
            head_nodding: 0,
            shutdown_freeze: 0,
            facial_microexpression_tension: 0
        };

        // Perfil de Sensibilidade
        this.profile = {
            auditorySensitivity: 1.0,
            motorSensitivity: 1.0,
            studentName: "Aluno Monitorado",
            classroomNoiseLevel: "Normal",
            noiseThresholdCriticalDb: 78
        };
    }

    setProfile(newProfile) {
        this.profile = { ...this.profile, ...newProfile };
    }

    /**
     * Processa o frame multimodal (Pose + FaceMesh FACS + Áudio + rPPG)
     */
    processFrame(poseLandmarks, faceLandmarks, ambientDb = 55, rppgData = { bpm: 75, isReliable: false }) {
        const timestamp = performance.now();

        // Rastreamento de Latência do Gatilho Acústico
        if (ambientDb >= this.profile.noiseThresholdCriticalDb) {
            this.lastNoiseSpikeTime = timestamp;
        }

        if (!poseLandmarks) {
            return this.getDefaultResult(ambientDb, rppgData);
        }

        const frameData = {
            timestamp,
            pose: poseLandmarks,
            face: faceLandmarks,
            db: ambientDb,
            bpm: rppgData.bpm
        };

        this.poseHistory.push(frameData);
        if (this.poseHistory.length > this.historySize) {
            this.poseHistory.shift();
        }

        // 1. Normalização Biomecânica Corporal
        const leftShoulder = poseLandmarks[11];
        const rightShoulder = poseLandmarks[12];
        const shoulderWidth = Math.max(0.08, this.distance(leftShoulder, rightShoulder));

        // 2. Análise FACS de Microexpressões Faciais
        const facs = this.extractFacialActionUnits(faceLandmarks, timestamp);

        // 3. Análise Comportamental Corporal & Métricas ABA
        const flapping = this.detectHandFlapping(shoulderWidth);
        const rocking = this.detectBodyRocking(shoulderWidth);
        const auditoryDefense = this.detectAuditoryDefense(poseLandmarks, shoulderWidth, timestamp, ambientDb);
        const visualDefense = this.detectVisualDefense(poseLandmarks, faceLandmarks, shoulderWidth, timestamp, facs);
        const headNodding = this.detectHeadNodding(poseLandmarks, shoulderWidth);
        const freezeShutdown = this.detectFreezeShutdown(poseLandmarks, shoulderWidth, timestamp);

        // Cálculo da Latência Sensorial (Δt entre ruído alto e defesa)
        let sensoryLatencySec = 0.0;
        if (this.lastNoiseSpikeTime && (auditoryDefense.detected || flapping.detected)) {
            sensoryLatencySec = parseFloat(((timestamp - this.lastNoiseSpikeTime) / 1000).toFixed(1));
        }

        // 4. Síntese Clínica em Cascata
        const clinicalState = this.synthesizeClinicalCascade({
            flapping,
            rocking,
            auditoryDefense,
            visualDefense,
            headNodding,
            freezeShutdown,
            facs,
            ambientDb,
            rppgData,
            sensoryLatencySec,
            timestamp
        });

        this.recordTimelinePoint(clinicalState);
        return clinicalState;
    }

    /**
     * Extração Geométrica das Action Units (FACS) no FaceMesh
     */
    extractFacialActionUnits(faceLandmarks, timestamp) {
        if (!faceLandmarks || faceLandmarks.length < 400) {
            return {
                au04_brow_furrow: 0,
                au24_lip_tension: 0,
                eye_aspect_ratio: 0.30,
                gazeFocusScore: 50,
                gazeStatus: gStatus,\ngazeFocusScore: gScore,
                isTensionActive: false,
                tensionDurationMs: 0
            };
        }

        const leftCheek = faceLandmarks[234];
        const rightCheek = faceLandmarks[454];
        const faceWidth = Math.max(0.05, Math.abs(leftCheek.x - rightCheek.x));

        // AU 04 (Brow Lowerer)
        const browL = faceLandmarks[105];
        const browR = faceLandmarks[334];
        const browDistance = Math.abs(browL.x - browR.x) / faceWidth;
        let au04Score = Math.max(0, Math.min(100, Math.round(((0.36 - browDistance) / 0.12) * 100)));

        // AU 24 (Lip Pressor)
        const lipTop = faceLandmarks[0];
        const lipBottom = faceLandmarks[17];
        const mouthL = faceLandmarks[61];
        const mouthR = faceLandmarks[291];
        const mouthHeight = Math.abs(lipTop.y - lipBottom.y);
        const mouthWidth = Math.abs(mouthL.x - mouthR.x);
        const lipRatio = mouthHeight / Math.max(0.01, mouthWidth);\n
        const nose = faceLandmarks[1];
        let gStatus = "Atenção Social";
        let gScore = 100;
        if (nose.x < 0.35 || nose.x > 0.65) {
            gStatus = "Desvio";
            gScore = 0;
        } else if (nose.y > 0.55) {
            gStatus = "Atenção Objeto";
            gScore = 50;
        } else {
            gStatus = "Atenção Social";
            gScore = 100;
        }

        let au24Score = Math.max(0, Math.min(100, Math.round(((0.22 - lipRatio) / 0.15) * 100)));

        // EAR (Eye Aspect Ratio)
        const eyeLH = Math.abs(faceLandmarks[159].y - faceLandmarks[145].y);
        const eyeLW = Math.abs(faceLandmarks[33].x - faceLandmarks[133].x);
        const ear = eyeLH / Math.max(0.01, eyeLW);

        // Atenção e Desvio de Olhar
        const nose = faceLandmarks[1];
        const dL = Math.abs(nose.x - leftCheek.x);
        const dR = Math.abs(nose.x - rightCheek.x);
        const asymmetry = Math.abs(dL - dR) / (dL + dR);
        const gazeFocusScore = Math.max(0, Math.min(100, Math.round((1 - asymmetry * 2.5) * 100)));
        const gazeStatus = gazeFocusScore > 65 ? "Frontal" : "Desviado";

        // Tensão Facial Mantida (> 800ms)
        const isCurrentlyTense = (au04Score >= 55 && au24Score >= 50) || (au04Score >= 70);
        if (isCurrentlyTense) {
            if (!this.facialTensionStartTime) this.facialTensionStartTime = timestamp;
        } else {
            this.facialTensionStartTime = null;
        }

        const tensionDurationMs = this.facialTensionStartTime ? Math.round(timestamp - this.facialTensionStartTime) : 0;
        const isTensionActive = tensionDurationMs >= 800;

        return {
            au04_brow_furrow: au04Score,\n            gazeStatus: gStatus,\n            gazeFocusScore: gScore,
            au24_lip_tension: au24Score,
            eye_aspect_ratio: parseFloat(ear.toFixed(2)),
            gazeFocusScore,
            gazeStatus,
            isTensionActive,
            tensionDurationMs
        };
    }

    /**
     * Hand Flapping
     */
    detectHandFlapping(scale) {
        if (this.poseHistory.length < 15) return { score: 0, hz: 0, detected: false, intensity: 'none' };

        const lWristY = [], rWristY = [], lWristX = [], rWristX = [];
        for (const f of this.poseHistory) {
            const lw = f.pose[15], rw = f.pose[16];
            if (lw && rw) {
                lWristY.push(lw.y / scale);
                rWristY.push(rw.y / scale);
                lWristX.push(lw.x / scale);
                rWristX.push(rw.x / scale);
            }
        }

        const lFlap = this.calculateOscillation(lWristY, lWristX);
        const rFlap = this.calculateOscillation(rWristY, rWristX);
        const maxHz = Math.max(lFlap.hz, rFlap.hz);
        const maxEnergy = Math.max(lFlap.energy, rFlap.energy) * this.profile.motorSensitivity;

        const isFlapRange = maxHz >= 2.0 && maxHz <= 6.5;
        const hasEnergy = maxEnergy > 0.07;

        let score = 0;
        if (isFlapRange && hasEnergy) {
            score = Math.min(100, Math.round((maxEnergy / 0.22) * 65 + (maxHz / 5.0) * 35));
        } else if (hasEnergy) {
            score = Math.min(45, Math.round(maxEnergy * 180));
        }

        return {
            score,
            hz: parseFloat(maxHz.toFixed(1)),
            detected: score >= 60,
            intensity: score >= 80 ? 'Alta' : score >= 60 ? 'Média' : 'Baixa'
        };
    }

    /**
     * Body Rocking com Amplitude Angular (Graus)
     */
    detectBodyRocking(scale) {
        if (this.poseHistory.length < 25) return { score: 0, hz: 0, detected: false, axis: 'none', angularAmplitudeDeg: 0 };

        const centerXs = [], centerYs = [];
        for (const f of this.poseHistory) {
            const ls = f.pose[11], rs = f.pose[12];
            if (ls && rs) {
                const midX = (ls.x + rs.x) / 2.0;
                const midY = (ls.y + rs.y) / 2.0;
                centerXs.push(midX / scale);
                centerYs.push(midY / scale);
            }
        }

        const oscX = this.calculateOscillation(centerXs);
        const oscY = this.calculateOscillation(centerYs);
        const maxOsc = oscX.energy > oscY.energy ? oscX : oscY;
        const axis = oscX.energy > oscY.energy ? 'Lateral' : 'Anteroposterior';

        // Amplitude Angular Estimada (Graus de arco)
        const angularAmplitudeDeg = Math.round(Math.min(60, maxOsc.energy * 220));

        const isRockingHz = maxOsc.hz >= 0.7 && maxOsc.hz <= 2.2;
        const hasEnergy = maxOsc.energy > 0.03 * this.profile.motorSensitivity;

        let score = 0;
        if (isRockingHz && hasEnergy) {
            score = Math.min(100, Math.round((maxOsc.energy / 0.09) * 75 + (maxOsc.hz / 2.0) * 25));
        }

        return {
            score,
            hz: parseFloat(maxOsc.hz.toFixed(1)),
            axis,
            angularAmplitudeDeg,
            detected: score >= 60
        };
    }

    /**
     * Defesa Auditiva
     */
    detectAuditoryDefense(landmarks, scale, timestamp, ambientDb) {
        const lw = landmarks[15], rw = landmarks[16];
        const le = landmarks[7], re = landmarks[8];
        if (!lw || !rw || !le || !re) return { score: 0, detected: false, durationMs: 0, isNoiseTriggered: false };

        const dL = this.distance(lw, le) / scale;
        const dR = this.distance(rw, re) / scale;

        const isCovering = (dL < 0.42 && dR < 0.42) || (dL < 0.32) || (dR < 0.32);
        const isLoudNoise = ambientDb >= this.profile.noiseThresholdCriticalDb;

        if (isCovering) {
            if (!this.earCoverStartTime) this.earCoverStartTime = timestamp;
            const durationMs = timestamp - this.earCoverStartTime;
            const noiseBoost = isLoudNoise ? 25 : 0;
            const score = Math.min(100, Math.round(55 + Math.min(45, durationMs / 15) * this.profile.auditorySensitivity + noiseBoost));

            return {
                score,
                detected: score >= 65,
                durationMs: Math.round(durationMs),
                type: (dL < 0.42 && dR < 0.42) ? 'Bilateral' : 'Unilateral',
                isNoiseTriggered: isLoudNoise,
                db: Math.round(ambientDb)
            };
        } else {
            this.earCoverStartTime = null;
            return { score: 0, detected: false, durationMs: 0, type: 'Nenhum', isNoiseTriggered: false, db: Math.round(ambientDb) };
        }
    }

    /**
     * Defesa Visual
     */
    detectVisualDefense(poseLandmarks, faceLandmarks, scale, timestamp, facs) {
        const lw = poseLandmarks[15], rw = poseLandmarks[16];
        const nose = poseLandmarks[0];
        if (!lw || !rw || !nose) return { score: 0, detected: false };

        const dL = this.distance(lw, nose) / scale;
        const dR = this.distance(rw, nose) / scale;

        const isHandsCoveringFace = (dL < 0.38 && dR < 0.38);
        const isProlongedEyeClose = facs.eye_aspect_ratio < 0.12;

        if (isHandsCoveringFace || isProlongedEyeClose) {
            if (!this.faceHideStartTime) this.faceHideStartTime = timestamp;
            const durationMs = timestamp - this.faceHideStartTime;
            const score = Math.min(100, Math.round(50 + Math.min(50, durationMs / 20)));
            return {
                score,
                detected: score >= 65,
                durationMs: Math.round(durationMs),
                type: isHandsCoveringFace ? "Mãos na Face" : "Olhos Fechados (Fotofobia)"
            };
        } else {
            this.faceHideStartTime = null;
            return { score: 0, detected: false, durationMs: 0, type: "Nenhum" };
        }
    }

    /**
     * Head Nodding
     */
    detectHeadNodding(poseLandmarks, scale) {
        if (this.poseHistory.length < 20) return { score: 0, hz: 0, detected: false };

        const noseYs = [];
        for (const f of this.poseHistory) {
            if (f.pose[0]) noseYs.push(f.pose[0].y / scale);
        }

        const osc = this.calculateOscillation(noseYs);
        const isNodding = osc.hz >= 1.2 && osc.hz <= 3.5 && osc.energy > 0.035;

        let score = 0;
        if (isNodding) {
            score = Math.min(100, Math.round(osc.energy * 250));
        }

        return {
            score,
            hz: parseFloat(osc.hz.toFixed(1)),
            detected: score >= 60
        };
    }

    /**
     * Freeze / Shutdown
     */
    detectFreezeShutdown(poseLandmarks, scale, timestamp) {
        if (this.poseHistory.length < 35) return { score: 0, detected: false };

        let totalMotion = 0;
        for (let i = 1; i < this.poseHistory.length; i++) {
            const p1 = this.poseHistory[i - 1].pose[0];
            const p2 = this.poseHistory[i].pose[0];
            if (p1 && p2) totalMotion += this.distance(p1, p2) / scale;
        }

        const avgMotion = totalMotion / this.poseHistory.length;
        const isRigid = avgMotion < 0.003;

        if (isRigid) {
            if (!this.freezeStartTime) this.freezeStartTime = timestamp;
            const duration = timestamp - this.freezeStartTime;
            if (duration > 3000) {
                return {
                    score: Math.min(100, Math.round(60 + (duration / 100))),
                    detected: true,
                    durationSeconds: (duration / 1000).toFixed(1)
                };
            }
        } else {
            this.freezeStartTime = null;
        }

        return { score: 0, detected: false, durationSeconds: 0 };
    }

    /**
     * Síntese Clínica com rPPG e Métricas ABA
     */
    synthesizeClinicalCascade(data) {
        const { flapping, rocking, auditoryDefense, visualDefense, headNodding, freezeShutdown, facs, ambientDb, rppgData, sensoryLatencySec, timestamp } = data;

        let stage = "CALM";
        let stageName = "🟢 Estágio 1: Calmo & Regulado";
        let title = "Comportamento Estável";
        let desc = `Ambiente em ${Math.round(ambientDb)} dB. Pulso cardíaco ${rppgData.bpm} BPM.`;
        let severity = "normal";
        let recommendation = "Manter o ritmo habitual da aula e incentivar a participação.";
        let eventType = null;

        const isTachycardia = rppgData.bpm >= 105;

        // Regras de Transição Clínica
        if (auditoryDefense.detected) {
            stage = "SENSORY_OVERLOAD";
            stageName = "🔴 Estágio 4: Sobrecarga Sensorial Acústica";
            title = auditoryDefense.isNoiseTriggered ? `⚠️ Sobrecarga Acústica (Ruído: ${Math.round(ambientDb)} dB | Δt: ${sensoryLatencySec}s)` : "⚠️ Defesa Sensorial Auditiva";
            desc = `Aluno cobrindo os ouvidos (${auditoryDefense.type}) após latência de ${sensoryLatencySec}s. Pulso: ${rppgData.bpm} BPM.`;
            severity = "critical";
            recommendation = `🚨 AÇÃO IMEDIATA: Ruído em ${Math.round(ambientDb)} dB. Oferecer abafador acústico imediatamente.`;
            eventType = "SENSORY_AUDITORY";
        } else if (visualDefense.detected) {
            stage = "SENSORY_OVERLOAD";
            stageName = "🔴 Estágio 4: Sobrecarga Visual / Fotofobia";
            title = `⚠️ Defesa Visual (${visualDefense.type})`;
            desc = `Defesa ocular sustentada há ${visualDefense.durationMs}ms.`;
            severity = "critical";
            recommendation = "🚨 AÇÃO IMEDIATA: Reduzir luminosidade de telas e fornecer suporte proprioceptivo suave.";
            eventType = "SENSORY_VISUAL";
        } else if (freezeShutdown.detected) {
            stage = "SHUTDOWN";
            stageName = "🟣 Estágio 4: Resposta de Congelamento (Shutdown)";
            title = "⚠️ Imobilidade / Sobrecarga Prolongada";
            desc = `Postura rígida sustentada por ${freezeShutdown.durationSeconds}s.`;
            severity = "critical";
            recommendation = "🚨 AÇÃO IMEDIATA: Não pressionar verbalmente. Ficar por perto e dar tempo de reprocessamento.";
            eventType = "SHUTDOWN_FREEZE";
        } else if (flapping.detected && rocking.detected) {
            stage = "ESCALATION";
            stageName = "🟠 Estágio 3: Agitação Comportamental em Cascata";
            title = `⚡ Flapping + Balanço (${rocking.angularAmplitudeDeg}°)`;
            desc = `Multi-estereotipia ativa. Pulso: ${rppgData.bpm} BPM.`;
            severity = "alert";
            recommendation = "⚠️ ATENÇÃO: Faça uma pausa estruturada de 3 minutos ou proponha uma atividade reguladora.";
            eventType = "MULTI_STIMMING";
        } else if (flapping.detected) {
            stage = "ESCALATION";
            stageName = "🟡 Estágio 2: Autorregulação Ativa (Flapping)";
            title = "⚡ Estereotipia Motora: Flapping";
            desc = `Movimento rítmico de punhos a ${flapping.hz} Hz (Intensidade ${flapping.intensity}).`;
            severity = "warning";
            recommendation = "💡 Observar sem interrupção abrupta (o flapping é autorregulação natural).";
            eventType = "HAND_FLAPPING";
        } else if (rocking.detected) {
            stage = "ESCALATION";
            stageName = `🟡 Estágio 2: Autorregulação Vestibular (${rocking.angularAmplitudeDeg}°)`;
            title = "🔄 Estereotipia: Balanço de Tronco";
            desc = `Balanço ${rocking.axis} a ${rocking.hz} Hz (Amplitude ${rocking.angularAmplitudeDeg}°).`;
            severity = "warning";
            recommendation = "💡 Permitir movimentação corporal. Busca por estímulo vestibular para manter o foco.";
            eventType = "BODY_ROCKING";
        } else if (isTachycardia && facs.isTensionActive) {
            stage = "RUMBLE";
            stageName = "🟡 Estágio 2: Ativação Simpática / Tensão Facial";
            title = `💓 Taquicardia Reativa (${rppgData.bpm} BPM) + FACS AU04`;
            desc = `Elevação da frequência cardíaca e franzir de sobrancelhas sustentados.`;
            severity = "warning";
            recommendation = "💡 ALERTA PRECOCE: O sistema autônomo do aluno indica estresse crescente. Proponha uma breve pausa para beber água.";
            eventType = "AUTONOMIC_STRESS";
        } else if (facs.isTensionActive) {
            stage = "RUMBLE";
            stageName = "🟡 Estágio 2: Inquietação Precoce (FACS AU04)";
            title = "🔍 Tensão Facial / Microexpressão Pré-Crise";
            desc = `Franzir de sobrancelhas (AU04: ${facs.au04_brow_furrow}%) sustentado.`;
            severity = "warning";
            recommendation = "💡 SINAL PRECOCE: O aluno está manifestando micro-tensão no rosto.";
            eventType = "FACIAL_TENSION";
        }

        const shouldTriggerEvent = eventType && this.canEmitEvent(eventType, timestamp);
        if (shouldTriggerEvent) {
            this.recordClinicalIncident({
                type: eventType,
                title,
                stage,
                stageName,
                recommendation,
                bpm: rppgData.bpm,
                sensoryLatencySec,
                angularAmplitudeDeg: rocking.angularAmplitudeDeg,
                ambientDb: Math.round(ambientDb),
                timestamp: new Date().toLocaleTimeString(),
                confidence: Math.max(flapping.score, auditoryDefense.score, rocking.score, facs.au04_brow_furrow) / 100.0
            });
        }

        const stressScore = Math.min(100, Math.round(
            flapping.score * 0.35 +
            auditoryDefense.score * 0.40 +
            rocking.score * 0.20 +
            visualDefense.score * 0.35 +
            (facs.au04_brow_furrow * 0.25) +
            freezeShutdown.score * 0.40 +
            (isTachycardia ? 20 : 0)
        ));

        return {
            stage,
            stageName,
            title,
            desc,
            severity,
            recommendation,
            stressScore,
            bpm: rppgData.bpm,
            sensoryLatencySec,
            angularAmplitudeDeg: rocking.angularAmplitudeDeg,
            ambientDb: Math.round(ambientDb),
            flapping,
            rocking,
            auditoryDefense,
            visualDefense,
            headNodding,
            freezeShutdown,
            facs,
            shouldTriggerEvent,
            eventPayload: shouldTriggerEvent ? {
                type: eventType,
                label: title,
                stage,
                recommendation,
                confidence: Math.max(flapping.score, auditoryDefense.score, facs.au04_brow_furrow) / 100.0,
                severity,
                metrics: {
                    stressScore,
                    bpm: rppgData.bpm,
                    sensoryLatencySec,
                    angularAmplitudeDeg: rocking.angularAmplitudeDeg,
                    ambientDb: Math.round(ambientDb),
                    au04: facs.au04_brow_furrow,
                    flappingHz: flapping.hz
                }
            } : null
        };
    }

    recordClinicalIncident(incident) {
        this.clinicalIncidentLog.unshift(incident);
        if (this.clinicalIncidentLog.length > 50) this.clinicalIncidentLog.pop();

        if (incident.type === 'HAND_FLAPPING') this.behaviorCounts.hand_flapping++;
        else if (incident.type === 'BODY_ROCKING') this.behaviorCounts.body_rocking++;
        else if (incident.type === 'SENSORY_AUDITORY') this.behaviorCounts.sensory_auditory++;
        else if (incident.type === 'SENSORY_VISUAL') this.behaviorCounts.sensory_visual++;
        else if (incident.type === 'HEAD_NODDING') this.behaviorCounts.head_nodding++;
        else if (incident.type === 'SHUTDOWN_FREEZE') this.behaviorCounts.shutdown_freeze++;
        else if (incident.type === 'FACIAL_TENSION') this.behaviorCounts.facial_microexpression_tension++;
    }

    recordTimelinePoint(state) {
        const now = performance.now();
        if (!this.lastTimelineRecord || now - this.lastTimelineRecord >= 800) {
            this.timelineHistory.push({
                time: new Date().toLocaleTimeString(),
                stress: state.stressScore,
                bpm: state.bpm || 75,
                db: state.ambientDb,
                au04: state.facs ? state.facs.au04_brow_furrow : 0,
                stage: state.stage
            });
            if (this.timelineHistory.length > 40) this.timelineHistory.shift();
            this.lastTimelineRecord = now;
        }
    }

    canEmitEvent(type, timestamp) {
        const last = this.lastEventTimes[type] || 0;
        if (timestamp - last > this.cooldownMs) {
            this.lastEventTimes[type] = timestamp;
            return true;
        }
        return false;
    }

    distance(p1, p2) {
        if (!p1 || !p2) return 999;
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dz = (p1.z || 0) - (p2.z || 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    calculateOscillation(seriesY, seriesX = null) {
        if (seriesY.length < 8) return { hz: 0, energy: 0 };
        let reversals = 0;
        let totalDisp = 0;

        for (let i = 1; i < seriesY.length - 1; i++) {
            const diff1 = seriesY[i] - seriesY[i - 1];
            const diff2 = seriesY[i + 1] - seriesY[i];
            if (diff1 * diff2 < 0) reversals++;
            totalDisp += Math.abs(diff1);
        }

        const duration = (this.historySize / 30.0);
        const hz = (reversals / 2.0) / duration;
        const energy = totalDisp / seriesY.length;
        return { hz, energy };
    }

    getClinicalReport() {
        const sessionDurationMin = Math.max(1, Math.round((Date.now() - this.sessionStartTime) / 60000));
        return {
            student: this.profile.studentName,
            sessionDate: new Date().toLocaleDateString('pt-BR'),
            sessionDuration: `${sessionDurationMin} minutos`,
            totalIncidents: this.clinicalIncidentLog.length,
            counts: this.behaviorCounts,
            incidents: this.clinicalIncidentLog,
            timeline: this.timelineHistory,
            pedagogicalSummary: this.generateReportSummary()
        };
    }

    generateReportSummary() {
        const total = this.clinicalIncidentLog.length;
        if (total === 0) return "Sessão estável sem registros de sobrecarga ou estereotipias agudas.";
        const dominant = Object.entries(this.behaviorCounts).sort((a, b) => b[1] - a[1])[0];
        return `Durante a sessão de ${total} registros, o padrão predominante foi '${dominant[0]}' (${dominant[1]} ocorrências). O tempo médio de latência frente a ruídos críticos foi registrado para análise pelo terapeuta ABA.`;
    }

    getDefaultResult(ambientDb = 50, rppgData = { bpm: 75 }) {
        return {
            stage: 'CALM',
            stageName: 'Buscando Aluno...',
            title: 'Enquadrando Câmera',
            desc: `Ambiente em ${Math.round(ambientDb)} dB. Pulso basal (${rppgData.bpm} BPM).`,
            severity: 'normal',
            recommendation: 'Aguardando detecção de pose e face.',
            stressScore: 0,
            bpm: rppgData.bpm,
            sensoryLatencySec: 0.0,
            angularAmplitudeDeg: 0,
            ambientDb: Math.round(ambientDb),
            flapping: { score: 0, hz: 0, detected: false },
            rocking: { score: 0, hz: 0, detected: false, angularAmplitudeDeg: 0 },
            auditoryDefense: { score: 0, detected: false, durationMs: 0 },
            visualDefense: { score: 0, detected: false },
            headNodding: { score: 0, detected: false },
            freezeShutdown: { score: 0, detected: false },
            facs: { au04_brow_furrow: 0, au24_lip_tension: 0, gazeFocusScore: 50, gazeStatus: "Aguardando" },
            shouldTriggerEvent: false
        };
    }
}

window.StimmingDetector = StimmingDetector;
