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
import { useTranslation } from '../lib/i18n';
import { AI_MODELS } from '../lib/aiModels';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  imageBase64?: string;
}

export default function AIChatbot() {
  const navigate = useNavigate();
  const { profile, setProfile, addNutritionEntry, removeNutritionEntry, addWater, workoutPlan, nutritionDiary, waterIntake } = useStore();
  const { t, language } = useTranslation();
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
    const justFinishedOnboarding = localStorage.getItem("just_finished_onboarding") === "true";
    
    if ((justFinishedOnboarding || !hasSeenWelcome) && profile) {
      // Clear the onboarding flag
      localStorage.removeItem("just_finished_onboarding");

      // Construct a highly personalized and beautifully guided welcome message
      const goalText = profile.primaryGoal === 'Lose Fat' ? (language === 'vi' ? 'Giảm mỡ' : 'Lose Fat')
                     : profile.primaryGoal === 'Build Muscle' ? (language === 'vi' ? 'Tăng cơ' : 'Build Muscle')
                     : profile.primaryGoal === 'Strength' ? (language === 'vi' ? 'Tăng sức mạnh' : 'Strength')
                     : profile.primaryGoal === 'Endurance' ? (language === 'vi' ? 'Tăng sức bền' : 'Endurance')
                     : (language === 'vi' ? 'Cải thiện sức khỏe' : 'Improve health');

      const styleText = profile.preferredStyle === 'Gym' ? (language === 'vi' ? 'Tập ở phòng Gym' : 'Gym training')
                      : profile.preferredStyle === 'Calisthenics' ? (language === 'vi' ? 'Tập Calisthenics' : 'Calisthenics')
                      : profile.preferredStyle === 'Home' ? (language === 'vi' ? 'Tập tại Nhà' : 'Home workout')
                      : (language === 'vi' ? 'Tập luyện' : 'Training');

      const welcomeContent = language === 'en'
        ? `Welcome to FitMetric, ${profile.name}! 🎉 I am your dedicated AI Health & Fitness assistant. Since your goal is **${goalText}** with **${styleText}**, here is your step-by-step roadmap to get started:

1️⃣ **Generate AI Workout**: Go to "Training" tab, press "Customize Plan" to design your highly optimized 7-day routine. You can log sets & weights here!
2️⃣ **Log Meals & Nutrition**: Go to "Nutrition" tab, press "Quét bữa ăn qua ảnh" to scan food with AI, or ask me (e.g., "Add 1 bowl of Pho beef").
3️⃣ **Log Water**: Click the quick suggestions below, or type "Log 300ml water".
4️⃣ **Scan Body & Posture**: Go to "Body Scanner" tab, upload a pose photo to estimate your body fat % and posture analysis.

Let's crush your goals together! What would you like to start with? 💪`
        : `Chào mừng bạn đến với FitMetric, ${profile.name}! 🎉 Tôi là trợ lý sức khỏe FitMetric AI của bạn. Với mục tiêu **${goalText}** bằng phương pháp **${styleText}**, tôi xin hướng dẫn bạn lộ trình từng bước để bắt đầu:

1️⃣ **Tạo lịch tập luyện AI**: Vào tab "Tập luyện", nhấn "Thiết lập giáo án" để AI thiết kế lịch tập 7 ngày. Bạn có thể ghi nhận mức tạ, số rep và tích hoàn thành hiệp tập trực tiếp!
2️⃣ **Nhật ký ăn uống & Quét bữa ăn**: Vào tab "Dinh dưỡng", nhấn "Quét bữa ăn qua ảnh" để AI tự động phân tích kcal/macros đĩa ăn, hoặc ra lệnh cho tôi (ví dụ: "Thêm 1 bát phở bò").
3️⃣ **Ghi lượng nước uống**: Bấm phím tắt nhanh bên dưới, hoặc nhắn tôi "Uống nước 300ml".
4️⃣ **Phân tích vóc dáng**: Vào tab "Body Scanner", tải ảnh toàn thân đứng thẳng để AI ước lượng tỉ lệ mỡ và phân tích tư thế đứng.

Hãy nhắn bất cứ câu hỏi nào để bắt đầu hành trình nâng tầm vóc dáng cùng nhau nhé! 💪`;

      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: welcomeContent,
        timestamp: Date.now(),
      }]);
      
      localStorage.setItem(welcomeKey, 'true');
      
      // Auto open chatbot with a smooth premium delay
      setTimeout(() => setIsOpen(true), 2000);
    } else if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome-back',
          role: 'assistant',
          content: language === 'en'
            ? 'Welcome back! How can I help you today? (e.g., "Add a bowl of pho to my diary" or "Update my weight to 75kg")'
            : 'Chào mừng trở lại! Tôi có thể giúp gì cho bạn hôm nay? (Ví dụ: "Thêm một bát phở vào nhật ký" hoặc "Cập nhật cân nặng của tôi là 75kg")',
          timestamp: Date.now(),
        }
      ]);
    }
  }, [profile, language]);

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
      toast.error(t('toast_image_too_large'));
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
        content: language === 'en' 
          ? 'Sorry, I encountered a connection issue. Please try again later!' 
          : 'Xin lỗi, tôi gặp chút trục trặc khi kết nối. Bạn vui lòng thử lại sau nhé!',
        timestamp: Date.now(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const processWithAI = async (userInput: string, imageBase64?: string | null) => {
    // Build today's context snapshot for the AI
    const todayCalories = nutritionDiary.reduce((s, e) => s + (e.kcal || 0), 0);
    const todayProtein  = nutritionDiary.reduce((s, e) => s + (e.protein || 0), 0);
    const todayFoodLog  = nutritionDiary.slice(0, 8).map(e => `${e.name} (${e.kcal}kcal)`).join(', ') || 'Chưa có';

    const todayDayIdx   = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
    const todayWorkout  = workoutPlan?.days?.[todayDayIdx];
    const todayFocus    = todayWorkout?.focusName || 'Nghỉ';
    const todayExNames  = todayWorkout?.exercises?.map((e: any) => e.name).join(', ') || 'Không có';

    const systemPrompt = `Bạn là FitMetric AI — trợ lý sức khỏe thông minh, thân thiện và am hiểu sâu về ứng dụng FitMetric. Nhiệm vụ chính của bạn là hỗ trợ và hướng dẫn người dùng sử dụng tối đa các tính năng của ứng dụng một cách tận tình, chi tiết và dễ hiểu nhất.

=== THÔNG TIN NGƯỜI DÙNG ===
Hồ sơ: ${JSON.stringify(profile)}

=== HÔM NAY (cập nhật real-time) ===
- Tổng calories nạp: ${todayCalories} kcal
- Protein: ${todayProtein}g
- Nước: ${waterIntake}ml
- Đã ăn: ${todayFoodLog}
- Bài tập hôm nay: ${todayFocus} — ${todayExNames}

=== LỊCH TẬP HIỆN TẠI ===
${workoutPlan ? workoutPlan.days?.map((d: any, i: number) => `${d.dayName || 'Ngày ' + (i+1)}: ${d.focusName} (${(d.exercises || []).map((e: any) => e.name).join(', ') || 'Nghỉ'})`).join('\n') : 'Chưa có lịch tập'}

=== CẤU TRÚC VÀ HƯỚNG DẪN SỬ DỤNG CHI TIẾT ỨNG DỤNG FITMETRIC ===
Khi người dùng hỏi về bất kỳ tính năng nào hoặc cách thực hiện điều gì đó trong ứng dụng, hãy hướng dẫn họ theo cẩm nang sau:

1. TRANG CHỦ (DASHBOARD) - /:
- Tính năng: Xem các chỉ số quan trọng hôm nay (Calo, Nước, Protein, Nhịp tim thực tế, Cân nặng hiện tại, Bài tập gợi ý).
- Cảnh báo chủ động (Proactive Alerts): Hệ thống sẽ tự động hiển thị cảnh báo màu sắc đẹp mắt nếu đến 14h/18h chưa uống đủ nước, 16h chưa đủ protein, hoặc 17h chưa tập luyện.
- Cách sử dụng: Xem trực tiếp biểu đồ cân nặng & lịch sử cân nặng. Nhấp vào các thẻ chỉ số để cập nhật nhanh hoặc theo dõi tiến trình.

2. TẬP LUYỆN (TRAINING) - /training:
- Tính năng: 
  + Giáo án tập luyện AI thiết kế tự động 7 ngày theo đúng mục tiêu của bạn.
  + Công cụ ghi nhận hiệp tập (Set Logger) cho từng bài: Nhập số tạ, số rep và tích chọn hoàn thành để tính tổng Volume tập luyện.
  + Thư viện video Youtube hướng dẫn tư thế, kỹ thuật động tác chuẩn xác. Có thể đóng góp video mới cho thư viện nếu bài tập đó chưa có.
  + Đồng bộ lịch: Cho phép tải file lịch tập .ics hoặc bấm lưu từng ngày vào Google Calendar.
  + Hệ thống nâng cấp độ khó tự động (Auto Upgrade): Cứ sau mỗi 14 buổi tập được hoàn thành, AI sẽ tự động phân tích tiến trình và đề xuất nâng cấp giáo án khó hơn 5-10% (Progressive Overload).
- Cách sử dụng: 
  + Menu -> Chọn tab "Tập luyện" (Training).
  + Để tạo/thiết kế lịch tập mới: Nhấn nút "Thiết lập giáo án" (Customize Plan), điền thông số (Mục tiêu, Số ngày/tuần, Dụng cụ Gym/Home/Calisthenics, Focus mong muốn) rồi nhấn "Tạo routine mới".
  + Để tập và ghi nhận: Click vào ngày hiện tại, điền tạ/rep và tích hoàn thành từng set tập. Sau khi tập xong tất cả, nhấn nút "Hoàn thành buổi tập" (Complete Session) ở cuối trang.
  + Xem hướng dẫn: Nhấp trực tiếp vào tên bài tập để xem video hướng dẫn từ Youtube. Nếu chưa có video, chọn "Bổ sung vào Database" và paste ID video Youtube.
  + Xuất lịch: Nhấp "Xuất lịch tập" (Export Calendar) để tải file ICS hoặc click từng ngày để lưu trực tiếp vào Google Calendar.
  + Để xem lịch sử tập luyện / chỉnh sửa số buổi: Bấm vào thẻ "Buổi tập đã hoàn thành" đầu trang.

3. DINH DƯỠNG (NUTRITION) - /nutrition:
- Tính năng: Nhật ký ăn uống, Máy quét bữa ăn AI (AI Meal Scanner), Bộ sáng tạo công thức nấu ăn lành mạnh (AI Recipe Generator).
- Cách sử dụng:
  + Menu -> Chọn tab "Dinh dưỡng" (Nutrition).
  + Nhật ký ăn uống: Tra cứu món ăn bằng thanh tìm kiếm thức ăn hoặc điền các chỉ số calo, protein, carb, fat thủ công.
  + Quét bữa ăn bằng AI: Bấm nút "Quét bữa ăn qua ảnh", tải lên hoặc chụp ảnh đĩa thức ăn của bạn, AI sẽ tự động bóc tách phân tích chi tiết lượng kcal, protein, carb, fat và lưu thẳng vào nhật ký hôm nay.
  + Tạo công thức AI: Cuộn xuống phần "Sáng tạo công thức AI", nhập các nguyên liệu sẵn có của bạn (ví dụ: "ức gà, trứng, súp lơ"), AI sẽ thiết kế công thức chế biến healthy đầy đủ hướng dẫn.

4. PHÂN TÍCH VÓC DÁNG (BODY SCANNER) - /scanner:
- Tính năng: AI Body Analyzer phân tích ảnh chụp toàn thân để ước lượng tỷ lệ mỡ cơ thể (body fat), tư thế đứng (posture), cấu trúc vóc dáng và đưa ra lời khuyên form tập luyện.
- Cách sử dụng: Menu -> Chọn tab "Body Scanner", chụp hoặc tải lên một bức ảnh chụp toàn thân ở tư thế đứng thẳng. Ảnh sẽ được phân tích sâu sắc và lưu trữ bảo mật trong tài khoản của bạn để tiện theo dõi sự thay đổi theo thời gian.

5. THIẾT BỊ ĐEO (WATCH) - /watch:
- Tính năng: Đồng bộ Strava (tự động cập nhật calo tiêu thụ khi chạy bộ, đạp xe...) và Kết nối Nhịp tim Bluetooth đo nhịp tim thời gian thực khi đang tập luyện.
- Cách sử dụng: Menu -> Chọn tab "Watch". Bấm kết nối API Strava hoặc bấm "Kết nối Bluetooth" để kết nối trực tiếp với đồng hồ thông minh (Apple Watch, Garmin, Fitbit...) của bạn qua Web Bluetooth API.

6. CÁ NHÂN (PROFILE) - /profile:
- Tính năng: Thay đổi chỉ số cơ thể (chiều cao, cân nặng, tỷ lệ mỡ), đặt mục tiêu thể hình, cường độ vận động, thay đổi ngôn ngữ ứng dụng (Tiếng Anh/Tiếng Việt).
- Cách sử dụng: Menu -> Chọn tab "Cá nhân" (Profile), cập nhật thông tin và nhấn Lưu.

=== KHẢ NĂNG HÀNH ĐỘNG ĐẶC BIỆT CỦA BẠN ===
Bạn có siêu năng lực tự động thực hiện các hành động trực tiếp cho người dùng. Hãy khéo léo thông báo cho người dùng biết bạn có năng lực này (ví dụ: "Tôi có thể giúp bạn cập nhật cân nặng ngay lập tức, bạn chỉ cần bảo tôi 'cập nhật cân nặng lên 72kg'").
Khi họ yêu cầu bất kỳ hành động nào dưới đây, bạn PHẢI đính kèm dòng mã ACTION chính xác ở dòng cuối cùng của phản hồi (không có bất kỳ định dạng Markdown hay ký tự nào bao quanh dòng ACTION này):

1. Cập nhật chỉ số cơ thể (cân nặng, chiều cao...):
ACTION:UPDATE_PROFILE:{"weight": 75}
(Hỗ trợ các key: weight, height, age, bodyFat, name)

2. Ghi món ăn vào nhật ký dinh dưỡng hôm nay:
ACTION:ADD_FOOD:{"name": "Phở bò", "kcal": 450, "protein": 25, "carbs": 60, "fat": 8}

3. Xóa món ăn khỏi nhật ký hôm nay:
ACTION:REMOVE_FOOD:{"name": "Phở bò"}

4. Ghi nhận lượng nước đã uống (ml):
ACTION:LOG_WATER:{"amount": 300}

5. Tạo lịch tập mới hoàn toàn (Hệ thống sẽ chuyển hướng họ sang trang /training và tự động mở form thiết lập giáo án với focus được chọn):
ACTION:REQUEST_WORKOUT:{"focus": "chest"}

6. Thay thế/Đổi một bài tập cụ thể trong giáo án hiện tại:
ACTION:REPLACE_EXERCISE:{"dayIndex": 0, "oldName": "Bench Press", "newName": "Dumbbell Press", "muscle": "Chest", "sets": "3x10", "rest": "90s"}
(dayIndex: 0 = Thứ 2, 1 = Thứ 3, ..., 6 = Chủ Nhật. Chỉ dùng REPLACE_EXERCISE khi họ muốn thay thế cụ thể một bài tập nào đó thay vì tạo lại cả lịch).

7. Thay thế/Cập nhật toàn bộ bài tập của một ngày cụ thể (Ví dụ khi họ muốn đổi ngày thứ 2 thành ngày tập chân):
ACTION:REPLACE_DAY_WORKOUT:{"dayIndex": 0, "focusName": "Tập chân (Legs)", "exercises": [{"name": "Squat", "muscle": "Legs", "sets": "4x10", "rest": "3 phút"}, {"name": "Lunges", "muscle": "Legs", "sets": "3x12", "rest": "90s"}]}
(dayIndex: 0 = Thứ 2, 1 = Thứ 3, ..., 6 = Chủ Nhật. BẮT BUỘC dùng REPLACE_DAY_WORKOUT khi người dùng muốn thay thế cả buổi tập của một ngày, không được hướng dẫn họ tự đi xóa hay thêm thủ công từng bài vì app không hỗ trợ việc đó).

=== QUY TẮC PHẢN HỒI QUAN TRỌNG ===
- NGÔN NGỮ: ${language === 'en' ? 'BẠN BẮT BUỘC PHẢI TRẢ LỜI HOÀN TOÀN BẰNG TIẾNG ANH.' : 'Luôn trả lời bằng tiếng Việt lịch sự, thân thiện và tràn đầy năng lượng tích cực.'}
- Khi giải thích cách dùng tính năng, hãy viết cực kỳ rõ ràng, chia bước rõ ràng (Bước 1, Bước 2...), chỉ rõ đường dẫn trang (ví dụ: Menu -> Chọn tab "Tập luyện").
- Súc tích, có cấu trúc, dùng emoji sinh động để người dùng có hứng thú sử dụng ứng dụng.
- KHÔNG dùng dấu ** để in đậm, KHÔNG dùng ### hay ## làm tiêu đề trong nội dung chat.
- Dùng số thứ tự (1. 2. 3.) hoặc dấu gạch đầu dòng (-) khi liệt kê.
- Phản hồi ngắn gọn, tự nhiên như đang nhắn tin trực tiếp, khoảng 3-6 dòng cho mỗi câu trả lời là lý tưởng nhất.`;

    // Build API payload (different var name to avoid shadowing React state)
    const apiMessages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    // Add conversation history (last 8 messages from React state)
    const history = messages.slice(-8);
    for (const m of history) {
      if (m.id !== 'welcome' && m.id !== 'welcome-back') {
        apiMessages.push({ role: m.role, content: m.content });
      }
    }

    // Add current message
    if (imageBase64) {
      const base64Data = imageBase64.split(',')[1];
      const mimeType = imageBase64.split(';')[0].replace('data:', '');
      apiMessages.push({
        role: "user",
        content: [
          { type: "text", text: userInput || "Phân tích ảnh này giúp tôi." },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } }
        ]
      });
    } else {
      apiMessages.push({ role: "user", content: userInput });
    }

    const response = await axios.post("/api/ai", {
      model: AI_MODELS.CEREBRAS_TEXT,
      messages: apiMessages,
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
      } else if (actionType === 'REMOVE_FOOD') {
        handleRemoveFood(actionData);
      } else if (actionType === 'LOG_WATER') {
        handleLogWater(actionData);
      } else if (actionType === 'REQUEST_WORKOUT') {
        handleRequestWorkout(actionData);
      } else if (actionType === 'REPLACE_EXERCISE') {
        handleReplaceExercise(actionData);
      } else if (actionType === 'REPLACE_DAY_WORKOUT') {
        handleReplaceDayWorkout(actionData);
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
        if (url) toast.success(t('toast_pose_saved'));
      }
    }
  };

  const handleUpdateProfile = (args: any) => {
    const updatedProfile = { ...profile, ...args };
    setProfile(updatedProfile);
    toast.success(t('toast_body_updated'));
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
    toast.success(t('toast_food_logged').replace('{name}', args.name));
  };

  const handleRemoveFood = (args: any) => {
    const { nutritionDiary } = useStore.getState();
    const idx = nutritionDiary.findIndex(
      (e) => e.name.toLowerCase().includes(args.name?.toLowerCase())
    );
    if (idx !== -1) {
      removeNutritionEntry(idx);
      toast.success(`ọRemoving "${nutritionDiary[idx].name}" khỏi nhật ký.`);
    } else {
      toast.error(`Không tìm thấy món "${args.name}" trong nhật ký hôm nay.`);
    }
  };

  const handleLogWater = (args: any) => {
    const amount = Number(args.amount) || 200;
    addWater(amount);
    toast.success(`💧 Đã ghi ${amount}ml nước`);
  };

  const handleRequestWorkout = (args: any) => {
    localStorage.setItem('workout_request_intent', args.focus || 'updated');
    navigate('/training');
    // small delay to ensure page is mounted
    setTimeout(() => {
      window.dispatchEvent(new Event('request_workout_generation'));
    }, 100);
    toast.info(t('toast_redirecting_training'));
  };

  const handleReplaceExercise = (args: any) => {
    const { workoutPlan, setWorkoutPlan } = useStore.getState();
    if (!workoutPlan?.days) {
      toast.error('Chưa có lịch tập để chỉnh sửa.');
      return;
    }

    const { dayIndex, oldName, newName, muscle, sets, rest } = args;
    const targetDayIdx = typeof dayIndex === 'number' ? dayIndex : 0;

    const updatedDays = workoutPlan.days.map((day: any, i: number) => {
      if (i !== targetDayIdx) return day;
      const updatedExercises = day.exercises.map((ex: any) => {
        const isMatch =
          ex.name?.toLowerCase().includes(oldName?.toLowerCase()) ||
          oldName?.toLowerCase().includes(ex.name?.toLowerCase());
        if (!isMatch) return ex;
        return {
          ...ex,
          name: newName,
          muscle: muscle || ex.muscle,
          sets: sets || ex.sets,
          rest: rest || ex.rest,
        };
      });
      return { ...day, exercises: updatedExercises };
    });

    setWorkoutPlan({ ...workoutPlan, days: updatedDays });
    toast.success(`✅ Đã thay "${oldName}" → "${newName}"`);
  };

  const handleReplaceDayWorkout = (args: any) => {
    const { workoutPlan, setWorkoutPlan } = useStore.getState();
    if (!workoutPlan?.days) {
      toast.error('Chưa có lịch tập để chỉnh sửa.');
      return;
    }

    const { dayIndex, focusName, exercises } = args;
    const targetDayIdx = typeof dayIndex === 'number' ? dayIndex : 0;

    const updatedDays = workoutPlan.days.map((day: any, i: number) => {
      if (i !== targetDayIdx) return day;
      return {
        ...day,
        focusName: focusName || day.focusName,
        exercises: Array.isArray(exercises) ? exercises.map((ex: any) => ({
          name: ex.name,
          muscle: ex.muscle || 'Unknown',
          sets: ex.sets || '3x10',
          rest: ex.rest || '90s',
          recommendedWeight: ex.recommendedWeight || undefined,
          youtubeQuery: ex.youtubeQuery || `${ex.name} tutorial form`,
        })) : []
      };
    });

    setWorkoutPlan({ ...workoutPlan, days: updatedDays });
    toast.success(`✅ Đã cập nhật buổi tập ngày ${workoutPlan.days[targetDayIdx]?.dayName || 'được chọn'} thành "${focusName}"`);
  };

  const todayDayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const todayFocus  = workoutPlan?.days?.[todayDayIdx]?.focusName;
  const totalKcal   = nutritionDiary.reduce((s, e) => s + (e.kcal || 0), 0);

  const quickActions = [
    { label: language === 'en' ? 'Log water 300ml' : 'Uống nước 300ml', icon: Activity },
    { label: language === 'en' ? 'Add meal' : 'Thêm bữa ăn', icon: Apple },
    { label: language === 'en' ? 'Today\'s workout' : `Hôm nay: ${todayFocus || 'Xem lịch tập'}`, icon: Dumbbell },
    { label: language === 'en' ? `Calories: ${totalKcal} kcal` : `Đã nạp: ${totalKcal} kcal`, icon: TrendingDown },
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
                      <div className={`p-4 rounded-2xl text-xs font-medium leading-relaxed break-words overflow-hidden w-full ${
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
                <Sparkles className="w-3 h-3 text-purple-400" /> Powered by Gemini
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
