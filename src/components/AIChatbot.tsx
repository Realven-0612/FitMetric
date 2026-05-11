import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, 
  X, 
  Send, 
  MessageSquare, 
  Loader2, 
  User, 
  Sparkles,
  ArrowRight,
  TrendingDown,
  ChevronRight,
  Dumbbell,
  Apple,
  Activity,
  ImagePlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router';
import axios from 'axios';

import { toast } from 'sonner';
import { useStore } from '../lib/store';
import { uploadPosePhoto } from '../services/firebaseService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  imageBase64?: string;
}

export default function AIChatbot() {
  const navigate = useNavigate();
  const { profile, setProfile, addNutritionEntry } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);

  // Initialize Welcome Message
  useEffect(() => {
    const userId = profile?.name || 'guest';
    const welcomeKey = `ai_welcome_${userId}`;
    const hasSeenWelcome = localStorage.getItem(welcomeKey);
    
    if (!hasSeenWelcome && profile) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Xin chào ${profile.name || 'bạn'}! 👋 Tôi là FitMetric AI. Tôi có thể giúp bạn theo dõi dinh dưỡng, cập nhật chỉ số cơ thể hoặc thiết kế bài tập cá nhân hóa. Bạn muốn bắt đầu từ đâu?`,
        timestamp: Date.now(),
      }]);
      localStorage.setItem(welcomeKey, 'true');
      setTimeout(() => setIsOpen(true), 1500);
    } else if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome-back',
          role: 'assistant',
          content: 'Chào mừng trở lại! Tôi có thể giúp gì cho bạn hôm nay? (Ví dụ: "Thêm một bát phở vào nhật ký" hoặc "Cập nhật cân nặng của tôi là 75kg")',
          timestamp: Date.now(),
        }
      ]);
    }
  }, [profile]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Ảnh quá lớn! Vui lòng chọn ảnh dưới 4MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPendingImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async () => {
    if ((!input.trim() && !pendingImage) || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input || '📷 Đã gửi ảnh',
      imageBase64: pendingImage || undefined,
      timestamp: Date.now(),
    };

    const imageToSend = pendingImage;
    const textToSend = input;

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setPendingImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsTyping(true);

    try {
      await processWithAI(textToSend, imageToSend);
    } catch (error) {
      console.error('AI Chat Error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Xin lỗi, tôi gặp chút trục trặc khi kết nối. Bạn vui lòng thử lại sau nhé!',
        timestamp: Date.now(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const processWithAI = async (userInput: string, imageBase64?: string | null) => {
    const systemPrompt = `Bạn là FitMetric AI — trợ lý sức khỏe thông minh, thân thiện và am hiểu sâu về ứng dụng FitMetric.

Thông tin người dùng hiện tại: ${JSON.stringify(profile)}

=== CẤU TRÚC ỨNG DỤNG FITMETRIC ===
- Dashboard: Tổng quan sức khỏe, calories, nước, protein, cân nặng, nhịp tim, bài tập hôm nay.
- Training: Lịch tập AI cá nhân hóa (7 ngày), set logger, ghi chú hiệp tập.
- Nutrition: Nhật ký ăn uống, scan đồ ăn bằng ảnh, công thức nấu ăn AI.
- Watch/Wearables: Kết nối Strava, hướng dẫn đồng hồ thông minh.
- Profile: Cập nhật chỉ số cơ thể, mục tiêu, ngôn ngữ (Tiếng Việt/English).

=== KHẢ NĂNG ĐẶC BIỆT ===
Khi người dùng muốn cập nhật chỉ số (cân nặng, chiều cao...), hãy trả lời kèm JSON ở cuối:
ACTION:UPDATE_PROFILE:{"weight": 75}

Khi người dùng muốn thêm thức ăn, hãy trả lời kèm:
ACTION:ADD_FOOD:{"name": "Phở bò", "kcal": 450, "protein": 25, "carbs": 60, "fat": 8}

Khi người dùng muốn tạo lịch tập mới, hãy trả lời kèm:
ACTION:REQUEST_WORKOUT:{"focus": "chest"}

=== QUY TẮC TRẢ LỜI ===
- Luôn trả lời bằng tiếng Việt (trừ khi user hỏi bằng tiếng Anh).
- Súc tích, có cấu trúc, dùng emoji nhẹ nhàng khi phù hợp.
- KHÔNG dùng dấu ** để in đậm, KHÔNG dùng ### hay ## để làm tiêu đề.
- Dùng số thứ tự (1. 2. 3.) hoặc dấu gạch đầu dòng (-) khi cần liệt kê.
- Viết tự nhiên như đang nhắn tin, mỗi câu trả lời gọn trong 3-5 dòng nếu có thể.`;

    const messages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    // Thêm lịch sử chat gần nhất (tối đa 6 tin nhắn)
    const recentMessages = messages.slice(-6);
    for (const m of recentMessages) {
      if (m.role !== 'system') {
        messages.push({ role: m.role, content: m.content });
      }
    }

    // Thêm tin nhắn hiện tại
    if (imageBase64) {
      const base64Data = imageBase64.split(',')[1];
      const mimeType = imageBase64.split(';')[0].replace('data:', '');
      messages.push({
        role: "user",
        content: [
          { type: "text", text: userInput || "Phân tích ảnh này giúp tôi." },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } }
        ]
      });
    } else {
      messages.push({ role: "user", content: userInput });
    }

    const response = await axios.post("/api/ai", {
      model: imageBase64 ? "llama-3.2-11b-vision-preview" : "meta-llama/llama-4-scout-17b-16e-instruct",
      messages,
    });

    const fullText: string = response.data.choices?.[0]?.message?.content || '';

    // Tách action ra khỏi text hiển thị
    let displayText = fullText;
    const actionMatch = fullText.match(/ACTION:([A-Z_]+):(\{.*?\})/s);

    if (actionMatch) {
      displayText = fullText.replace(/ACTION:[A-Z_]+:\{.*?\}/s, '').trim();
      const actionType = actionMatch[1];
      const actionData = JSON.parse(actionMatch[2]);

      if (actionType === 'UPDATE_PROFILE') {
        handleUpdateProfile(actionData);
      } else if (actionType === 'ADD_FOOD') {
        handleAddFood(actionData);
      } else if (actionType === 'REQUEST_WORKOUT') {
        handleRequestWorkout(actionData);
      }
    }

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content: displayText,
      timestamp: Date.now(),
    }]);

    if (imageBase64) {
      const responseText = displayText.toLowerCase();
      const isPosePhoto = responseText.includes('vóc dáng') || responseText.includes('% mỡ') || responseText.includes('cơ thể');
      if (isPosePhoto) {
        const url = await uploadPosePhoto(imageBase64);
        if (url) toast.success('Đã lưu ảnh pose vào hồ sơ!');
      }
    }
  };

  const handleUpdateProfile = (args: any) => {
    const updatedProfile = { ...profile, ...args };
    setProfile(updatedProfile);
    toast.success('Chỉ số cơ thể đã được cập nhật!');
  };

  const handleAddFood = (args: any) => {
    addNutritionEntry({
      name: args.name,
      kcal: args.kcal || 0,
      protein: args.protein || 0,
      carbs: args.carbs || 0,
      fat: args.fat || 0,
      timestamp: new Date().toISOString()
    });
    toast.success(`Đã thêm ${args.name} vào nhật ký!`);
  };

  const handleRequestWorkout = (args: any) => {
    localStorage.setItem('workout_request_intent', args.focus || 'updated');
    navigate('/training');
    // small delay to ensure page is mounted
    setTimeout(() => {
      window.dispatchEvent(new Event('request_workout_generation'));
    }, 100);
    toast.info('Đang chuyển hướng đến trang bài tập...');
  };

  const quickActions = [
    { label: 'Cập nhật cân nặng', icon: Activity },
    { label: 'Thêm bữa ăn', icon: Apple },
    { label: 'Tạo bài tập mới', icon: Dumbbell },
  ];

  return (
    <>
      {/* Floating Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-600 p-[2px] shadow-[0_0_20px_rgba(34,211,238,0.3)] z-[100] group"
      >
        <div className="w-full h-full bg-[#111111] rounded-[14px] flex items-center justify-center relative overflow-hidden">
          <Bot className="h-6 w-6 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 bg-cyan-400/10 blur-xl"
          />
        </div>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 right-6 w-[90vw] sm:w-[400px] h-[600px] max-h-[80vh] bg-[#111111]/95 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-cyan-500/10 to-purple-500/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-600 p-[1.5px]">
                  <div className="w-full h-full bg-[#111111] rounded-[9px] flex items-center justify-center overflow-hidden relative">
                    <Bot className="w-5 h-5 text-cyan-400 absolute z-0" />
                    <img 
                      src="/assets/app_icon.png" 
                      alt="Logo" 
                      className="w-full h-full object-cover z-10 relative" 
                      onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                    />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-black text-white tracking-widest uppercase flex items-center gap-2">
                    FitMetric AI
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Online Now</span>
                  </div>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white hover:bg-white/5 rounded-xl h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6 custom-scrollbar">
              {messages.map((m) => (
                <div 
                  key={m.id} 
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-3 max-w-[85%] min-w-0 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center border ${
                      m.role === 'assistant' 
                        ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' 
                        : 'bg-white/5 border-white/10 text-white'
                    }`}>
                      {m.role === 'assistant' ? <Sparkles className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    <div className={`space-y-1 min-w-0 overflow-hidden ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                      <div className={`p-4 rounded-2xl text-xs font-medium leading-relaxed break-words break-all overflow-hidden w-full ${
                        m.role === 'assistant'
                          ? 'bg-[#1a1a1a] text-slate-200 border border-white/5'
                          : 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/10'
                      }`}>
                        {m.imageBase64 && (
                          <img 
                            src={m.imageBase64} 
                            alt="Ảnh đính kèm" 
                            className="w-full max-w-[200px] rounded-xl mb-2 object-cover"
                          />
                        )}
                        {m.content}
                      </div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.1em] px-1">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                   <div className="flex gap-3 max-w-[85%]">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="bg-[#1a1a1a] border border-white/5 p-4 rounded-2xl">
                        <div className="flex gap-1">
                          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        </div>
                      </div>
                   </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions */}
            {messages.length < 5 && (
              <div className="px-6 pb-2">
                <div className="flex gap-2 flex-wrap pb-2">
                  {quickActions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(action.label)}
                      className="flex-shrink-0 flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full px-4 py-2 text-[10px] font-bold text-slate-300 transition-all"
                    >
                      <action.icon className="w-3 h-3 text-cyan-400" />
                      {action.label}
                      <ChevronRight className="w-3 h-3 opacity-50" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 border-t border-white/5 bg-[#161616]">
              
              {/* Preview ảnh đang chờ gửi */}
              {pendingImage && (
                <div className="relative inline-block mb-3">
                  <img src={pendingImage} alt="preview" className="h-16 w-16 rounded-xl object-cover border border-white/10" />
                  <button
                    onClick={() => setPendingImage(null)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-black"
                  >✕</button>
                </div>
              )}
              <div className="flex items-center gap-2">
                {/* Nút upload ảnh */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-10 h-10 shrink-0 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-400 hover:text-cyan-400 transition-all"
                >
                  <ImagePlus className="w-4 h-4" />
                </button>
                {/* Input text */}
                <div className="relative flex-1">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Nhắn tin hoặc gửi ảnh..."
                    className="w-full bg-black/40 border-white/10 focus-visible:border-cyan-500/50 focus-visible:ring-cyan-500/30 rounded-2xl h-12 pl-4 pr-12 text-sm text-white placeholder:text-slate-500 transition-all font-medium"
                  />
                  <Button 
                    onClick={handleSend}
                    disabled={(!input.trim() && !pendingImage) || isTyping}
                    className="absolute right-1.5 top-1 h-9 w-9 bg-cyan-500 hover:bg-cyan-400 rounded-xl flex items-center justify-center p-0 shadow-[0_0_15px_rgba(34,211,238,0.3)] disabled:opacity-50 disabled:grayscale transition-all"
                  >
                    <Send className="w-3.5 h-3.5 text-black" />
                  </Button>
                </div>
              </div>
              <p className="text-[10px] text-center text-slate-600 font-bold uppercase tracking-widest mt-3 flex items-center justify-center gap-2">
                <Sparkles className="w-3 h-3 text-purple-400" /> Powered by Groq AI
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
