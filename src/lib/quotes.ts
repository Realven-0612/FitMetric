export const quotes = {
  en: [
    "The only bad workout is the one that didn't happen. — Unknown",
    "Motivation is what gets you started. Habit is what keeps you going. — Jim Ryun",
    "Sweat is just fat crying. — Unknown",
    "Your body can stand almost anything. It's your mind that you have to convince. — Unknown",
    "Fitness is not about being better than someone else. It's about being better than you used to be. — Khloe Kardashian",
    "Discipline is doing what you hate to do, but doing it like you love it. — Mike Tyson",
    "Success starts with self-discipline. — Unknown",
    "Wake up with determination. Go to bed with satisfaction. — George Horace Lorimer",
    "Push yourself, because no one else is going to do it for you. — Unknown",
    "Great things never come from comfort zones. — Unknown",
    "Dream it. Wish it. Do it. — Unknown",
    "Success doesn't just find you. You have to go out and get it. — Unknown",
    "The harder you work for something, the greater you'll feel when you achieve it. — Unknown",
    "Dream bigger. Do bigger. — Unknown",
    "Don't stop when you're tired. Stop when you're done. — David Goggins",
  ],
  vi: [
    "Buổi tập tồi tệ nhất là buổi tập bạn bỏ lỡ. — Khuyết danh",
    "Động lực là thứ giúp bạn bắt đầu. Thói quen là thứ giữ bạn bước tiếp. — Jim Ryun",
    "Mồ hôi chỉ là mỡ đang khóc. — Khuyết danh",
    "Cơ thể bạn có thể chịu đựng đến giới hạn. Tâm trí mới là thứ bạn cần thuyết phục. — Khuyết danh",
    "Thể hình không phải là tốt hơn người khác. Mà là tốt hơn chính bạn của ngày hôm qua. — Khloe Kardashian",
    "Kỷ luật là làm những việc bạn ghét, nhưng với thái độ như bạn yêu nó. — Mike Tyson",
    "Thành công bắt đầu từ sự kỷ luật. — Khuyết danh",
    "Thức dậy với sự quyết tâm. Đi ngủ với sự thỏa mãn. — George Horace Lorimer",
    "Hãy ép bản thân, vì sẽ không ai làm điều đó giúp bạn. — Khuyết danh",
    "Những điều tuyệt vời không bao giờ đến từ vùng an toàn. — Khuyết danh",
    "Hãy mơ. Hãy ước. Hãy làm. — Khuyết danh",
    "Thành công không tự tìm đến bạn. Bạn phải vươn ra và giành lấy nó. — Khuyết danh",
    "Càng chăm chỉ vì điều gì, bạn càng cảm thấy tuyệt vời khi đạt được nó. — Khuyết danh",
    "Mơ lớn hơn. Làm lớn hơn. — Khuyết danh",
    "Đừng dừng lại khi mệt mỏi. Hãy dừng lại khi bạn đã hoàn thành. — David Goggins",
  ]
};

export function getDailyQuote(lang: 'en' | 'vi' = 'en'): string {
  // Use day of the year to rotate quotes consistently per day
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  const quoteList = quotes[lang] || quotes['en'];
  const index = diff % quoteList.length;
  
  return quoteList[index];
}
