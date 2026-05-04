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
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router';
import { GoogleGenAI, Type } from '@google/genai';
import { toast } from 'sonner';
import { useStore } from '../lib/store';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export default function AIChatbot() {
  const navigate = useNavigate();
  const { profile, setProfile, addNutritionEntry } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Welcome Message
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('ai_welcome_seen');
    if (!hasSeenWelcome) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: 'Xin chào! Tôi là FitMetric AI. Tôi có thể giúp bạn theo dõi dinh dưỡng, cập nhật chỉ số cơ thể hoặc thiết kế bài tập cá nhân hóa. Bạn muốn bắt đầu từ đâu?',
          timestamp: Date.now(),
        }
      ]);
      localStorage.setItem('ai_welcome_seen', 'true');
      setIsOpen(true);
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
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      await processWithAI(input);
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

  const processWithAI = async (userInput: string) => {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Define Tools
    const tools = [
      {
        functionDeclarations: [
          {
            name: 'update_profile',
            description: 'Update user profile metrics like weight, height, age, target, etc.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                weight: { type: Type.NUMBER, description: 'User weight in kg' },
                height: { type: Type.NUMBER, description: 'User height in cm' },
                age: { type: Type.NUMBER, description: 'User age' },
                bodyFat: { type: Type.NUMBER, description: 'Body fat percentage' },
                primaryGoal: { type: Type.STRING, enum: ['Lose Fat', 'Build Muscle', 'Strength', 'Endurance'] },
                activityLevel: { type: Type.STRING, enum: ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active'] },
              }
            }
          },
          {
            name: 'add_food_entry',
            description: 'Add a food entry to the daily diary.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: 'Name of the food' },
                kcal: { type: Type.NUMBER, description: 'Calories' },
                protein: { type: Type.NUMBER, description: 'Protein in grams' },
                carbs: { type: Type.NUMBER, description: 'Carbs in grams' },
                fat: { type: Type.NUMBER, description: 'Fat in grams' },
              },
              required: ['name', 'kcal']
            }
          },
          {
            name: 'request_workout_generation',
            description: 'Triggers the generation of a new workout plan based on specific intent.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                focus: { type: Type.STRING, description: 'Specific area to focus on, e.g., "chest", "legs", "full body"' }
              }
            }
          }
        ]
      }
    ];

    const chat = ai.chats.create({ 
      model: 'gemini-1.5-flash',
      config: {
        systemInstruction: `
          Bạn là FitMetric AI, một trợ lý sức khỏe thông minh và thân thiện cho ứng dụng FitMetric.
          Nhiệm vụ của bạn:
          1. Hướng dẫn người dùng mới về cách sử dụng ứng dụng (Scanner để quét cơ thể, Training để xem bài tập, Nutrition để theo dõi ăn uống).
          2. Tương tác và trả lời các câu hỏi về sức khỏe, tập luyện.
          3. Thực hiện các hành động hệ thống thông qua Function Calling:
             - Cập nhật chỉ số cơ thể (cân nặng, chiều cao, tuổi, mỡ, mục tiêu).
             - Thêm mục vào nhật ký thực phẩm (tên món, kcal, protein, carb, fat).
             - Yêu cầu tạo bài tập mới.
          
          Luôn trả lời bằng tiếng Việt, súc tích, chuyên nghiệp và có động lực.
          Nếu người dùng cung cấp thông tin như "Tôi nặng 75kg", hãy gọi hàm update_profile.
          Nếu người dùng nói "Sáng nay tôi ăn 1 quả trứng", hãy gọi hàm add_food_entry.
          Nếu người dùng nói "Lập cho tôi bài tập ngực", hãy gọi hàm request_workout_generation.
        `,
        tools: tools,
      }
    });

    const result = await chat.sendMessage({ message: userInput });
    const calls = result.functionCalls;

    if (calls && calls.length > 0) {
      for (const call of calls) {
        if (call.name === 'update_profile') {
          handleUpdateProfile(call.args);
          const followUp = await chat.sendMessage({
            message: [
              {
                functionResponse: {
                  name: 'update_profile',
                  response: { success: true }
                }
              }
            ]
          });
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: followUp.text || '',
            timestamp: Date.now(),
          }]);
        } else if (call.name === 'add_food_entry') {
          handleAddFood(call.args);
          const followUp = await chat.sendMessage({
            message: [
              {
                functionResponse: {
                  name: 'add_food_entry',
                  response: { success: true }
                }
              }
            ]
          });
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: followUp.text || '',
            timestamp: Date.now(),
          }]);
        } else if (call.name === 'request_workout_generation') {
          handleRequestWorkout(call.args);
          const followUp = await chat.sendMessage({
            message: [
              {
                functionResponse: {
                  name: 'request_workout_generation',
                  response: { success: true }
                }
              }
            ]
          });
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: followUp.text || '',
            timestamp: Date.now(),
          }]);
        }
      }
    } else {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: result.text || '',
        timestamp: Date.now(),
      }]);
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
                  <div className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center border ${
                      m.role === 'assistant' 
                        ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' 
                        : 'bg-white/5 border-white/10 text-white'
                    }`}>
                      {m.role === 'assistant' ? <Sparkles className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    <div className={`space-y-1 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                      <div className={`p-4 rounded-2xl text-xs font-medium leading-relaxed break-words overflow-hidden ${
                        m.role === 'assistant'
                          ? 'bg-[#1a1a1a] text-slate-200 border border-white/5'
                          : 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/10'
                      }`}>
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
            <div className="p-6 border-t border-white/5 bg-[#161616]">
              <div className="relative group">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type a message..."
                  className="w-full bg-black/40 border-white/10 focus-visible:border-cyan-500/50 focus-visible:ring-cyan-500/30 rounded-2xl h-14 pl-5 pr-14 text-sm text-white placeholder:text-slate-500 transition-all font-medium"
                />
                <Button 
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="absolute right-2 top-2 h-10 w-10 bg-cyan-500 hover:bg-cyan-400 rounded-xl flex items-center justify-center p-0 shadow-[0_0_15px_rgba(34,211,238,0.3)] disabled:opacity-50 disabled:grayscale transition-all"
                >
                  <Send className="w-4 h-4 text-black" />
                </Button>
              </div>
              <p className="text-[10px] text-center text-slate-600 font-bold uppercase tracking-widest mt-4 flex items-center justify-center gap-2">
                <Sparkles className="w-3 h-3 text-purple-400" /> Powered by Gemini Ultra Intelligence
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
