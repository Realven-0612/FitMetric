export interface Quote {
  en: string;
  vi: string;
  author: string;
}

export const quotes: Quote[] = [
  {
    en: "I hated every minute of training, but I said, 'Don't quit. Suffer now and live the rest of your life as a champion.'",
    vi: "Tôi ghét từng phút tập luyện, nhưng tôi tự nhủ: 'Đừng bỏ cuộc. Chịu đựng bây giờ và sống phần đời còn lại như một nhà vô địch.'",
    author: "Muhammad Ali"
  },
  {
    en: "Strength does not come from winning. Your struggles develop your strengths.",
    vi: "Sức mạnh không đến từ chiến thắng. Những cuộc đấu tranh phát triển sức mạnh của bạn.",
    author: "Arnold Schwarzenegger"
  },
  {
    en: "Blood, sweat and respect. First two you give, last one you earn.",
    vi: "Máu, mồ hôi và sự tôn trọng. Hai cái đầu bạn cho đi, cái cuối cùng bạn nhận lại.",
    author: "Dwayne 'The Rock' Johnson"
  },
  {
    en: "It is health that is real wealth and not pieces of gold and silver.",
    vi: "Sức khỏe mới là tài sản thực sự chứ không phải vàng bạc.",
    author: "Mahatma Gandhi"
  },
  {
    en: "If something stands between you and your success, move it. Never be denied.",
    vi: "Nếu có điều gì cản trở giữa bạn và thành công của bạn, hãy dời nó đi. Đừng bao giờ khuất phục.",
    author: "Dwayne 'The Rock' Johnson"
  },
  {
    en: "The last three or four reps is what makes the muscle grow. This area of pain divides a champion from someone who is not a champion.",
    vi: "Ba hoặc bốn lần lặp lại cuối cùng là lặp lại phát triển cơ bắp. Khoảng đau đớn này phân định ranh giới giữa nhà vô địch và người bình thường.",
    author: "Arnold Schwarzenegger"
  },
  {
    en: "Don't count the days, make the days count.",
    vi: "Đừng đếm thời gian trôi qua, hãy khiến cho chúng có ý nghĩa.",
    author: "Muhammad Ali"
  },
  {
    en: "Take care of your body. It's the only place you have to live.",
    vi: "Hãy chăm sóc cho cơ thể bạn. Đó là nơi duy nhất bạn phải sống.",
    author: "Jim Rohn"
  }
];

export function getQuoteOfTheDay(): Quote {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  
  return quotes[dayOfYear % quotes.length];
}
