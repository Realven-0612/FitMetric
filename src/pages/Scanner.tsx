import React, { useState, useRef, useEffect } from "react";
import { GoogleGenAI } from "@google/genai";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Fingerprint, Camera, UploadCloud, Loader2, Zap, LayoutGrid, Info, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

type ScanMode = "COMPOSITION" | "FORM";
type LiftType = "SQUAT" | "DEADLIFT" | "UNKNOWN";

export default function Scanner() {
  const [mode, setMode] = useState<ScanMode>("COMPOSITION");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [useWebcam, setUseWebcam] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const detectorRef = useRef<poseDetection.PoseDetector | null>(null);
  
  // Form Assistance State
  const [activeLift, setActiveLift] = useState<LiftType>("UNKNOWN");
  const [formFeedback, setFormFeedback] = useState<string>("Align yourself in the frame");
  const [isGoodForm, setIsGoodForm] = useState(true);

  // Initialize Detector
  useEffect(() => {
    const initDetector = async () => {
      try {
        await tf.ready();
        const model = poseDetection.SupportedModels.MoveNet;
        const detector = await poseDetection.createDetector(model, {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER
        });
        detectorRef.current = detector;
      } catch (err) {
        console.error("Failed to init detector:", err);
      }
    };
    initDetector();
  }, []);

  useEffect(() => {
    let requestRef: number;
    
    const runDetection = async () => {
      if (mode === "FORM" && detectorRef.current && webcamRef.current && webcamRef.current.video?.readyState === 4) {
        const video = webcamRef.current.video;
        const poses = await detectorRef.current.estimatePoses(video);
        
        if (poses && poses.length > 0) {
          drawPose(poses[0]);
          analyzeForm(poses[0]);
        }
      }
      requestRef = requestAnimationFrame(runDetection);
    };

    if (mode === "FORM") {
      runDetection();
    }

    return () => cancelAnimationFrame(requestRef);
  }, [mode, activeLift]);

  const drawPose = (pose: poseDetection.Pose) => {
    if (!canvasRef.current || !webcamRef.current?.video) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const video = webcamRef.current.video;
    canvasRef.current.width = video.videoWidth;
    canvasRef.current.height = video.videoHeight;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw skeleton
    const connections = poseDetection.util.getAdjacentPairs(poseDetection.SupportedModels.MoveNet);
    ctx.lineWidth = 4;
    ctx.strokeStyle = isGoodForm ? '#22d3ee' : '#f87171'; // Cyan for good, Red for bad

    connections.forEach(([p1_idx, p2_idx]) => {
      const p1 = pose.keypoints[p1_idx];
      const p2 = pose.keypoints[p2_idx];
      if (p1 && p2 && p1.score && p2.score && p1.score > 0.3 && p2.score > 0.3) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    });

    // Draw keypoints
    pose.keypoints.forEach(kp => {
      if (kp.score && kp.score > 0.3) {
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = isGoodForm ? '#22d3ee' : '#f87171';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  };

  const analyzeForm = (pose: poseDetection.Pose) => {
    const kps = pose.keypoints;
    const find = (name: string) => kps.find(k => k.name === name);
    
    const hipR = find('right_hip');
    const kneeR = find('right_knee');
    const ankleR = find('right_ankle');
    const shoulderR = find('right_shoulder');
    
    if (!hipR || !kneeR || !ankleR || !shoulderR) return;

    // Detect if move is squat
    if (activeLift === "SQUAT" || activeLift === "UNKNOWN") {
       const kneeAngle = calculateAngle(hipR, kneeR, ankleR);
       if (kneeAngle < 120) {
          if (activeLift === "UNKNOWN") setActiveLift("SQUAT");
          if (kneeAngle < 95) {
             setFormFeedback("Good depth! Core engaged.");
             setIsGoodForm(true);
          } else {
             setFormFeedback("Go deeper! Drop your hips.");
             setIsGoodForm(false);
          }
       }
    }

    if (activeLift === "DEADLIFT" || activeLift === "UNKNOWN") {
       const backAngle = calculateAngle(shoulderR, hipR, kneeR);
       if (backAngle < 140 && hipR.y > shoulderR.y) {
          if (activeLift === "UNKNOWN") setActiveLift("DEADLIFT");
          setFormFeedback("Keep back neutral. Chest up.");
          setIsGoodForm(true);
       }
    }
  };

  const calculateAngle = (p1: any, p2: any, p3: any) => {
    const angle = Math.abs(
      Math.atan2(p3.y - p2.y, p3.x - p2.x) - 
      Math.atan2(p1.y - p2.y, p1.x - p2.x)
    );
    return (angle * 180) / Math.PI;
  };

  const capture = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImage(imageSrc);
      setUseWebcam(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!image) return;
    setLoading(true);
    setAnalysis(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const base64Data = image.split(",")[1];
      const mimeType = image.split(";")[0].split(":")[1];

      const prompt = `You are a professional fitness coach and AI body analyst. 
      Analyze the person in this image. Provide a detailed assessment of their current physique.
      Return the result strictly as a JSON object with this shape:
      {
        "bodyFatEstimate": "number (e.g. 15.5)",
        "physiqueType": "Short description of body type",
        "muscleMass": "Low / Average / High",
        "strengths": ["list of observed strong points"],
        "weaknesses": ["list of areas to improve"],
        "recommendation": "A professional actionable advice for their training",
        "score": number between 1 to 100 representing overall fitness aesthetics
      }`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ inlineData: { data: base64Data, mimeType } }, prompt],
        config: { responseMimeType: "application/json" }
      });

      const data = JSON.parse(response.text.trim());
      setAnalysis(data);
      
      const history = JSON.parse(localStorage.getItem('scan_history') || '[]');
      history.unshift({ date: new Date().toISOString(), image: image, ...data });
      localStorage.setItem('scan_history', JSON.stringify(history));
      toast.success("Analysis complete!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to analyze image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 w-full h-full lg:min-h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 w-fit self-center lg:self-start">
        <button 
          onClick={() => { setMode("COMPOSITION"); setUseWebcam(false); }}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === "COMPOSITION" ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(34,211,238,0.3)]' : 'text-slate-400 hover:text-white'}`}
        >
          <Fingerprint className="w-4 h-4" /> Composition Scan
        </button>
        <button 
          onClick={() => { setMode("FORM"); setUseWebcam(true); }}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === "FORM" ? 'bg-purple-500 text-black shadow-[0_0_20px_rgba(112,0,255,0.3)]' : 'text-slate-400 hover:text-white'}`}
        >
          <LayoutGrid className="w-4 h-4" /> Form Assistant
        </button>
      </div>

      <Card className="bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden shadow-none rounded-[2rem] flex-1 flex flex-col">
        <CardContent className="p-0 flex flex-col lg:flex-row h-full overflow-hidden">
          {mode === "COMPOSITION" ? (
            <div className="flex flex-col lg:flex-row w-full h-full">
               <div className={`p-6 flex-1 flex flex-col justify-center items-center ${analysis ? 'lg:border-r border-white/10 lg:w-1/2' : 'w-full'} transition-all`}>
                  {!image && !useWebcam && (
                    <div className="w-full max-w-lg aspect-square flex flex-col items-center justify-center border-2 border-dashed border-white/20 rounded-[2rem] bg-slate-900/40 hover:bg-slate-900/60 hover:border-primary/50 transition-all p-8 text-center gap-8 group cursor-pointer relative"
                         onClick={() => fileInputRef.current?.click()}>
                      <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl scale-[2.0] group-hover:scale-[2.5] transition-transform duration-500"></div>
                        <UploadCloud className="w-10 h-10 text-primary relative z-10" />
                      </div>
                      <div>
                        <h3 className="font-black text-2xl text-white mb-2 uppercase">Upload Physique</h3>
                        <p className="text-sm text-slate-400">Drag & drop or click to browse</p>
                      </div>
                      <div className="flex gap-4">
                        <Button onClick={(e) => { e.stopPropagation(); setUseWebcam(true); }} variant="outline" className="rounded-2xl border-white/10 bg-black/50">CAMERA</Button>
                        <Button className="rounded-2xl bg-cyan-400 text-black font-black">BROWSE</Button>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload}/>
                      </div>
                    </div>
                  )}
                  {useWebcam && (
                    <div className="relative w-full max-w-lg aspect-[3/4] bg-slate-900 rounded-[2rem] overflow-hidden border border-white/10">
                      <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="w-full h-full object-cover" />
                      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
                        <Button onClick={capture} className="rounded-full w-14 h-14 bg-white text-black"><Camera className="w-5 h-5"/></Button>
                        <Button onClick={() => setUseWebcam(false)} variant="destructive" className="rounded-full w-14 h-14">X</Button>
                      </div>
                    </div>
                  )}
                  {image && (
                     <div className="w-full h-full max-w-md mx-auto flex flex-col justify-center gap-4">
                        <div className="relative rounded-[2rem] overflow-hidden border border-white/10 aspect-[3/4]">
                          <img src={image} alt="Physique" className="w-full h-full object-cover" />
                          {loading && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-8 gap-6">
                               <Fingerprint className="w-20 h-20 text-primary animate-pulse"/>
                               <div className="text-primary font-mono text-sm tracking-widest font-bold">ANALYZING...</div>
                            </div>
                          )}
                        </div>
                        {!loading && !analysis && <Button onClick={analyzeImage} className="w-full bg-cyan-500 h-14 rounded-2xl font-black">START SCAN</Button>}
                     </div>
                  )}
               </div>
               {analysis && (
                 <div className="flex-1 p-8 bg-slate-900/30 overflow-y-auto space-y-8">
                    <div className="flex items-center gap-3">
                       <Fingerprint className="w-8 h-8 text-primary shadow-primary"/>
                       <h2 className="text-2xl font-black text-white uppercase">Scan Report</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <Card className="bg-white/5 p-4 rounded-2xl border-white/10">
                          <p className="text-[10px] text-slate-500 uppercase font-black">Body Fat</p>
                          <p className="text-3xl font-black text-primary">{analysis.bodyFatEstimate}%</p>
                       </Card>
                       <Card className="bg-white/5 p-4 rounded-2xl border-white/10">
                          <p className="text-[10px] text-slate-500 uppercase font-black">Fitness Score</p>
                          <p className="text-3xl font-black text-white">{analysis.score}/100</p>
                       </Card>
                    </div>
                    <div className="bg-secondary/10 p-6 rounded-2xl border border-secondary/30">
                       <p className="text-[10px] text-secondary uppercase font-black mb-2 tracking-widest">Recommendation</p>
                       <p className="text-sm text-slate-300 leading-relaxed">{analysis.recommendation}</p>
                    </div>
                    <Button onClick={() => {setImage(null); setAnalysis(null);}} className="w-full rounded-2xl border-white/10 bg-white/5 text-slate-400 h-12">NEW SCAN</Button>
                 </div>
               )}
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row w-full h-full">
              <div className="flex-1 p-6 flex flex-col items-center justify-center relative min-h-[400px]">
                <div className="relative w-full max-w-2xl bg-black rounded-[2rem] overflow-hidden border border-white/10 aspect-video lg:aspect-video">
                  <Webcam ref={webcamRef} audio={false} className="w-full h-full object-cover scale-x-[-1]" />
                  <canvas ref={canvasRef} className="absolute inset-0 w-full h-full scale-x-[-1]" />
                  <div className="absolute top-6 left-6 flex flex-col gap-2">
                     <div className={`px-4 py-2 rounded-xl backdrop-blur-md border font-black text-[10px] uppercase tracking-widest flex items-center gap-2 ${isGoodForm ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400' : 'bg-red-500/20 border-red-500/30 text-red-400'}`}>
                        {isGoodForm ? <ShieldCheck className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {activeLift === "UNKNOWN" ? "CALIBRATING..." : activeLift}
                     </div>
                  </div>
                  <div className="absolute bottom-6 left-6 right-6">
                     <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                        <Zap className={`w-6 h-6 ${isGoodForm ? 'text-cyan-400' : 'text-red-400'}`} />
                        <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase leading-none mb-1 tracking-widest">Feedback</p>
                          <p className="text-white font-bold text-sm">{formFeedback}</p>
                        </div>
                     </div>
                  </div>
                </div>
              </div>
              <div className="lg:w-[380px] p-8 border-l border-white/10 bg-slate-900/30 overflow-y-auto space-y-8 flex flex-col">
                 <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">AI Form Guard</h2>
                 <div className="grid grid-cols-2 gap-3">
                    <Button onClick={() => setActiveLift("SQUAT")} className={`h-16 rounded-2xl flex flex-col font-black ${activeLift === "SQUAT" ? 'bg-cyan-500 text-black' : 'bg-white/5 text-slate-400'}`}>SQUAT <span className="text-[8px] opacity-60 uppercase font-bold">Depth</span></Button>
                    <Button onClick={() => setActiveLift("DEADLIFT")} className={`h-16 rounded-2xl flex flex-col font-black ${activeLift === "DEADLIFT" ? 'bg-purple-500 text-black' : 'bg-white/5 text-slate-400'}`}>DEADLIFT <span className="text-[8px] opacity-60 uppercase font-bold">Back</span></Button>
                 </div>
                 <div className="mt-auto p-6 rounded-3xl bg-white/5 border border-white/5 space-y-4">
                    <div className="flex items-center gap-2">
                       <Info className="w-4 h-4 text-cyan-400" />
                       <span className="text-[10px] font-black text-white uppercase tracking-widest tracking-tighter">Expert Tips</span>
                    </div>
                    <ul className="text-xs text-slate-400 space-y-3 list-disc pl-4 italic">
                       <li>Stand sideways to the camera</li>
                       <li>Ensure full body visibility</li>
                       <li>Keep core braced throughout</li>
                    </ul>
                 </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
