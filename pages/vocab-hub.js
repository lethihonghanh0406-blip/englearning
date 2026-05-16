const CATEGORIES = [
  {
    group: 'Cơ thể',
    icon: '🫁',
    color: '#2563eb',
    bg: '#dbeafe',
    topics: [
      { en: 'Body',             vi: 'Cơ thể người',    emoji: '🫁', route: '/english/vocab/body' },
      { en: 'Face',             vi: 'Khuôn mặt',       emoji: '😊', route: null },
      { en: 'Organs',           vi: 'Nội tạng',        emoji: '🫀', route: null },
      { en: 'Skeleton',         vi: 'Bộ xương',        emoji: '💀', route: null },
      { en: 'Digestive System', vi: 'Hệ tiêu hóa',    emoji: '🧬', route: null },
      { en: 'Medicine',         vi: 'Y tế',            emoji: '💊', route: null },
    ]
  },
  {
    group: 'Trang phục',
    icon: '👕',
    color: '#7c3aed',
    bg: '#f5f3ff',
    topics: [
      { en: "Men's Clothing",   vi: 'Quần áo nam',     emoji: '👔', route: null },
      { en: "Women's Clothing", vi: 'Quần áo nữ',      emoji: '👗', route: null },
      { en: 'Winter Clothing',  vi: 'Áo mùa đông',     emoji: '🧥', route: null },
      { en: 'Jewelry',          vi: 'Trang sức',       emoji: '💍', route: null },
      { en: 'Sleepwear',        vi: 'Đồ ngủ',          emoji: '🩱', route: null },
      { en: 'Sewing',           vi: 'May vá',          emoji: '🧵', route: null },
    ]
  },
  {
    group: 'Thực phẩm',
    icon: '🍎',
    color: '#16a34a',
    bg: '#dcfce7',
    topics: [
      { en: 'Fruits',           vi: 'Trái cây',        emoji: '🍎', route: null },
      { en: 'Vegetables',       vi: 'Rau củ',          emoji: '🥦', route: null },
      { en: 'Food',             vi: 'Thức ăn',         emoji: '🍔', route: null },
      { en: 'Food II',          vi: 'Thức ăn II',      emoji: '🍜', route: null },
      { en: 'Breakfast',        vi: 'Bữa sáng',        emoji: '🍳', route: null },
      { en: 'Meat',             vi: 'Thịt',            emoji: '🥩', route: null },
      { en: 'Drinks',           vi: 'Đồ uống',         emoji: '🥤', route: null },
      { en: 'Sweets',           vi: 'Bánh kẹo',        emoji: '🍰', route: null },
    ]
  },
  {
    group: 'Động vật',
    icon: '🐾',
    color: '#b45309',
    bg: '#fef3c7',
    topics: [
      { en: 'Farm Animals',     vi: 'Động vật nông trại', emoji: '🐄', route: null },
      { en: 'Pets',             vi: 'Thú cưng',        emoji: '🐶', route: null },
      { en: 'Insects',          vi: 'Côn trùng',       emoji: '🐛', route: null },
      { en: 'Birds',            vi: 'Chim',            emoji: '🐦', route: null },
      { en: 'Mammals',          vi: 'Động vật có vú',  emoji: '🦁', route: null },
      { en: 'Reptiles',         vi: 'Bò sát',          emoji: '🦎', route: null },
      { en: 'African Animals',  vi: 'Động vật châu Phi', emoji: '🦒', route: null },
      { en: 'Sea Animals',      vi: 'Động vật biển',   emoji: '🐠', route: null },
    ]
  },
  {
    group: 'Thiên nhiên',
    icon: '🌿',
    color: '#059669',
    bg: '#d1fae5',
    topics: [
      { en: 'Plants',           vi: 'Thực vật',        emoji: '🌱', route: null },
      { en: 'Landscape',        vi: 'Phong cảnh',      emoji: '🏔️', route: null },
      { en: 'Weather',          vi: 'Thời tiết',       emoji: '⛅', route: null },
      { en: 'Sea',              vi: 'Biển',            emoji: '🌊', route: null },
      { en: 'Camping',          vi: 'Cắm trại',        emoji: '🏕️', route: '/english/vocab/camping' },
    ]
  },
  {
    group: 'Ngôi nhà',
    icon: '🏠',
    color: '#dc2626',
    bg: '#fee2e2',
    topics: [
      { en: 'House',            vi: 'Nhà',             emoji: '🏠', route: null },
      { en: 'Garden',           vi: 'Sân vườn',        emoji: '🌻', route: null },
      { en: 'Living Room',      vi: 'Phòng khách',     emoji: '🛋️', route: null },
      { en: 'Kitchen',          vi: 'Nhà bếp',         emoji: '🍳', route: null },
      { en: 'Bedroom',          vi: 'Phòng ngủ',       emoji: '🛏️', route: null },
      { en: 'Bathroom',         vi: 'Phòng tắm',       emoji: '🚿', route: null },
    ]
  },
  {
    group: 'Giao thông',
    icon: '🚗',
    color: '#0891b2',
    bg: '#cffafe',
    topics: [
      { en: 'Car',              vi: 'Ô tô',            emoji: '🚗', route: null },
      { en: 'Travel',           vi: 'Du lịch',         emoji: '✈️', route: null },
      { en: 'Land Travel',      vi: 'Đường bộ',        emoji: '🚌', route: null },
      { en: 'Sea Travel',       vi: 'Đường biển',      emoji: '⛴️', route: null },
    ]
  },
  {
    group: 'Khác',
    icon: '🎯',
    color: '#64748b',
    bg: '#f1f5f9',
    topics: [
      { en: 'Colors',           vi: 'Màu sắc',         emoji: '🎨', route: null },
      { en: 'Family',           vi: 'Gia đình',        emoji: '👨‍👩‍👧‍👦', route: null },
      { en: 'Tools',            vi: 'Công cụ',         emoji: '🔧', route: null },
      { en: 'Jobs',             vi: 'Nghề nghiệp',     emoji: '👷', route: null },
      { en: 'Sports',           vi: 'Thể thao',        emoji: '⚽', route: null },
      { en: 'Space',            vi: 'Vũ trụ',          emoji: '🚀', route: null },
      { en: 'Science',          vi: 'Khoa học',        emoji: '🔬', route: null },
      { en: 'Music',            vi: 'Âm nhạc',         emoji: '🎸', route: null },
      { en: 'Art',              vi: 'Nghệ thuật',      emoji: '🖼️', route: null },
      { en: 'City',             vi: 'Thành phố',       emoji: '🏙️', route: null },
    ]
  },
]

export default function vocabHubPage(app) {
  const available = CATEGORIES.flatMap(c => c.topics).filter(t => t.route).length

  app.innerHTML = `
    <style>
      .vh-card {
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 12px;
        padding: 14px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: default;
        transition: .15s;
        position: relative;
      }
      .vh-card.available {
        cursor: pointer;
        border-color: #2563eb44;
      }
      .vh-card.available:hover {
        background: #253352;
        border-color: #2563eb;
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(37,99,235,.2);
      }
      .vh-badge-new {
        position: absolute;
        top: -6px;
        right: 10px;
        background: #2563eb;
        color: white;
        font-size: 9px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 10px;
        letter-spacing: .5px;
      }
      .vh-badge-soon {
        font-size: 9px;
        color: #475569;
        background: #0f172a;
        border: 1px solid #334155;
        padding: 1px 7px;
        border-radius: 10px;
        white-space: nowrap;
        margin-left: auto;
      }
    </style>

    <div style="min-height:100vh;background:#0f172a;padding:32px 24px">

      <!-- Header -->
      <div style="max-width:1100px;margin:0 auto 32px">
        <h1 style="font-size:28px;font-weight:800;color:#f1f5f9;margin:0 0 6px;font-family:'Space Grotesk',sans-serif">
          📖 Từ vựng hình ảnh
        </h1>
        <p style="color:#64748b;font-size:14px;margin:0">
          Rê chuột vào ảnh để học từ vựng theo chủ đề — ${available} chủ đề đã có
        </p>
      </div>

      <!-- Categories -->
      <div style="max-width:1100px;margin:0 auto;display:flex;flex-direction:column;gap:32px">
        ${CATEGORIES.map(cat => `
          <div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
              <span style="font-size:20px">${cat.icon}</span>
              <h2 style="font-size:15px;font-weight:700;color:#94a3b8;margin:0;letter-spacing:.5px;text-transform:uppercase">
                ${cat.group}
              </h2>
              <div style="flex:1;height:1px;background:#1e293b"></div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">
              ${cat.topics.map(t => `
                <div class="vh-card ${t.route ? 'available' : ''}"
                  ${t.route ? `onclick="navigate('${t.route}')"` : ''}>
                  ${t.route ? `<span class="vh-badge-new">✓ Có</span>` : ''}
                  <span style="font-size:24px;line-height:1">${t.emoji}</span>
                  <div style="min-width:0">
                    <div style="font-size:13px;font-weight:600;color:${t.route ? '#f1f5f9' : '#475569'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                      ${t.en}
                    </div>
                    <div style="font-size:11px;color:${t.route ? '#93c5fd' : '#334155'}">
                      ${t.vi}
                    </div>
                  </div>
                  ${!t.route ? `<span class="vh-badge-soon">Sắp có</span>` : ''}
                </div>`).join('')}
            </div>
          </div>`).join('')}
      </div>

    </div>`
}
