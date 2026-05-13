let EXCEL_DATA = [];

async function loadData() {
  try {
    const res = await fetch('./data.json');
    EXCEL_DATA = await res.json();
  } catch (e) {
    console.warn('تعذّر تحميل data.json');
  }
}
loadData();

var inp  = document.getElementById('inp');
var msgs = document.getElementById('msgs');

function addMsg(text, cls) {
  var d = document.createElement('div');
  d.className = 'msg ' + cls;
  d.textContent = text;
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
  return d;
}

function smartAnswer(q) {
  if (!EXCEL_DATA.length) return 'لم يتم تحميل البيانات، تأكد من وجود ملف data.json في المجلد.';

  const entities = [...new Set(EXCEL_DATA.map(r => r['الجهة']))];

  // رفض من الوزارة
  if (q.includes('وزار')) {
    const total = EXCEL_DATA.reduce((s,r) => s + (parseFloat(r['النماذج المرفوضة من الوزارة']) || 0), 0);
    const byEntity = {};
    EXCEL_DATA.forEach(r => {
      const v = parseFloat(r['النماذج المرفوضة من الوزارة']) || 0;
      if (v > 0) byEntity[r['الجهة']] = (byEntity[r['الجهة']] || 0) + v;
    });
    const details = Object.entries(byEntity).map(([k,v]) => k + ': ' + v).join('\n');
    return 'اجمالي النماذج المرفوضة من الوزارة: ' + total + '\n\nتفصيل حسب الجهة:\n' + details;
  }

  // رفض من الإدارة
  if (q.includes('ادار') || q.includes('إدار')) {
    const total = EXCEL_DATA.reduce((s,r) => s + (parseFloat(r['النماذج المرفوضة من الإدارة']) || 0), 0);
    const byEntity = {};
    EXCEL_DATA.forEach(r => {
      const v = parseFloat(r['النماذج المرفوضة من الإدارة']) || 0;
      if (v > 0) byEntity[r['الجهة']] = (byEntity[r['الجهة']] || 0) + v;
    });
    const details = Object.entries(byEntity).map(([k,v]) => k + ': ' + v).join('\n');
    return 'اجمالي النماذج المرفوضة من الإدارة: ' + total + '\n\nتفصيل حسب الجهة:\n' + details;
  }

  // ملخص
  if (q.includes('ملخص') || q.includes('اجمالي') || q.includes('إجمالي') || q.includes('كم')) {
    const totalAdmin = EXCEL_DATA.reduce((s,r) => s + (parseFloat(r['النماذج المرفوضة من الإدارة']) || 0), 0);
    const totalMin   = EXCEL_DATA.reduce((s,r) => s + (parseFloat(r['النماذج المرفوضة من الوزارة']) || 0), 0);
    return 'ملخص البيانات:\n- اجمالي السجلات: ' + EXCEL_DATA.length + '\n- اجمالي الرفض من الإدارة: ' + totalAdmin + '\n- اجمالي الرفض من الوزارة: ' + totalMin + '\n- عدد الجهات: ' + entities.length;
  }

  // قائمة الجهات
  if (q.includes('جهات') || q.includes('بلديات') || q.includes('قائمة')) {
    return 'الجهات المتاحة (' + entities.length + ' جهة):\n' + entities.join('\n');
  }

  // بحث عن جهة
  const matched = entities.find(e => {
    const eName = e.replace('بلدية','').replace('محافظة','').replace('أمانة منطقة','').trim();
    return q.includes(eName) || q.includes(e);
  });
  if (matched) {
    const rows = EXCEL_DATA.filter(r => r['الجهة'] === matched);
    const rejAdmin = rows.reduce((s,r) => s + (parseFloat(r['النماذج المرفوضة من الإدارة']) || 0), 0);
    const rejMin   = rows.reduce((s,r) => s + (parseFloat(r['النماذج المرفوضة من الوزارة']) || 0), 0);
    const models   = [...new Set(rows.map(r => r['النماذج']))].join('، ');
    return 'معلومات ' + matched + ':\n- الرفض من الإدارة: ' + rejAdmin + '\n- الرفض من الوزارة: ' + rejMin + '\n- النماذج: ' + models;
  }

  // تصنيف
  if (q.includes('أحمر') || q.includes('احمر')) {
    const count = EXCEL_DATA.filter(r => r['تصنيف النماذج'] === 'أحمر').length;
    return 'عدد السجلات ذات التصنيف الأحمر: ' + count;
  }
  if (q.includes('أخضر') || q.includes('اخضر')) {
    const count = EXCEL_DATA.filter(r => r['تصنيف النماذج'] === 'أخضر').length;
    return 'عدد السجلات ذات التصنيف الأخضر: ' + count;
  }

  // بحث نصي
  const words = q.split(' ').filter(w => w.length > 2);
  const relevant = EXCEL_DATA.filter(r =>
    words.some(w => Object.values(r).join(' ').includes(w))
  ).slice(0, 5);
  if (relevant.length) {
    return relevant.map(r =>
      'الجهة: ' + r['الجهة'] + ' | النموذج: ' + r['النماذج'] + ' | رفض إدارة: ' + r['النماذج المرفوضة من الإدارة'] + ' | رفض وزارة: ' + r['النماذج المرفوضة من الوزارة']
    ).join('\n');
  }

  return 'يمكنني مساعدتك في:\n- كم رفض الوزارة؟\n- كم رفض الإدارة؟\n- ملخص البيانات\n- قائمة الجهات\n- معلومات جهة معينة (مثال: بقعاء، الحائط، سميراء)';
}

function sendMsg() {
  var text = inp.value.trim();
  if (!text) return;
  addMsg(text, 'user');
  inp.value = '';
  var thinking = addMsg('جاري البحث في البيانات...', 'bot thinking');
  setTimeout(function() {
    thinking.remove();
    addMsg(smartAnswer(text), 'bot');
  }, 400);
}

inp.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') sendMsg();
});

window.sendMsg = sendMsg;
