import { useState } from 'react';
import { useI18n } from '../i18n.jsx';
import { ChevronDown, HelpCircle } from 'lucide-react';

const faqData = [
  {
    qEn: 'Can I book for schools, colleges, or educational delegations?',
    qAm: 'ለትምህርት ቤቶች፣ ኮሌጆች ወይም የትምህርት ቡድኖች መያዝ ይቻላል?',
    aEn: 'Yes! When booking, select "School / Institution". You will be asked for your institution’s name and 10-digit Tax Identification Number (TIN) to generate the official institutional receipt. Both guided and self-guided options are available.',
    aAm: 'አዎ! ቦታ በሚይዙበት ጊዜ "የትምህርት ቤት / ተቋም" የሚለውን ይምረጡ። ይፋዊ ደረሰኝ ለማዘጋጀት የተቋምዎ ስም እና ባለ 10 አሃዝ የግብር ከፋይ መለያ ቁጥር (TIN) ይጠየቃሉ። የመመራት ወይም በራስ መመራት ጉብኝት መምረጥ ይቻላል።',
  },
  {
    qEn: 'How does the digital QR ticket work at the museum gate?',
    qAm: 'ዲጂታል የQR ትኬቱ በሙዚየሙ መግቢያ በር ላይ እንዴት ይሰራል?',
    aEn: 'Once your payment is verified, your visitor account displays an authentic, security-signed QR ticket. Show this QR ticket on your smartphone at the entrance at Arat Kilo Campus. The cashier or gate scanner reads the QR code and records individual visitor admissions instantly.',
    aAm: 'ክፍያዎ ከተረጋገጠ በኋላ በጎብኚ መለያዎ ውስጥ ይፋዊ የተረጋገጠ የQR ትኬት ይታያል። ይህን የQR ትኬት በአራት ኪሎ ካምፓስ በሚገኘው የሙዚየም መግቢያ በር በስልክዎ ያሳዩ። የበር ሰራተኞች ስካን በማድረግ የገቡትን ሰዎች ቁጥር በቀጥታ ይመዘግባሉ።',
  },
  {
    qEn: 'What payment methods are supported for online booking?',
    qAm: 'ምን አይነት የመስመር ላይ የክፍያ አማራጮች ይሰራሉ?',
    aEn: 'All payments are securely processed through Chapa, supporting Telebirr, CBE Birr, Awash Birr, and local/international debit and credit cards.',
    aAm: 'ሁሉም ክፍያዎች በChapa የክፍያ መድረክ በኩል በደህና የሚፈጸሙ ሲሆን ቴሌብር፣ CBE ብር፣ አዋሽ ብር እና የአገር ውስጥና ዓለም አቀፍ የባንክ ካርዶችን ይቀበላሉ።',
  },
  {
    qEn: 'What is the policy for rescheduling and cancellations?',
    qAm: 'ቀን የመቀየር እና የመሰረዝ ፖሊሲው ምንድነው?',
    aEn: 'You can reschedule your visit date once for free inside the allowed window. For cancellations, a 10% administrative fee applies before the visit date and 25% within 7 days after the visit date. The payment gateway fee is non-refundable.',
    aAm: 'በተፈቀደው የጊዜ ገደብ ውስጥ የጉብኝት ቀንዎን አንድ ጊዜ በነፃ መቀየር ይችላሉ። ቦታ ማስያዣን ለመሰረዝ ከጉብኝት ቀን በፊት 10% እና ከጉብኝት ቀን በኋላ ባሉት 7 ቀናት ውስጥ 25% ተቀናሽ ይደረጋል። የክፍያ አገልግሎት ክፍያ አይመለስም።',
  },
  {
    qEn: 'Are guided tours available with university zoologists?',
    qAm: 'ከሙዚየሙ የዙኦሎጂ ባለሙያዎች ጋር የተመራ ጉብኝት አለ?',
    aEn: 'Yes! Guided tours are led by University zoological staff and subject to slot availability. You can choose an available time slot during booking to guarantee your guided tour experience.',
    aAm: 'አዎ! የተመሩ ጉብኝቶች በዩኒቨርሲቲው የዙኦሎጂ ባለሙያዎች የሚመሩ ሲሆን በቦታ ማስያዣ ጊዜ የሚገኝ ሰዓት በመምረጥ አስቀድሞ መያዝ ይቻላል።',
  },
];

export function LandingFaq() {
  const { lang } = useI18n();
  const am = lang === 'am';
  const [openIndex, setOpenIndex] = useState(0);

  const toggle = (index) => {
    setOpenIndex((curr) => (curr === index ? null : index));
  };

  return (
    <div className="faq-container">
      <div className="faq-list">
        {faqData.map((item, index) => {
          const isOpen = openIndex === index;
          const q = am ? item.qAm : item.qEn;
          const a = am ? item.aAm : item.aEn;

          return (
            <div
              key={index}
              className={`faq-card ${isOpen ? 'open' : ''}`}
            >
              <button
                type="button"
                onClick={() => toggle(index)}
                aria-expanded={isOpen}
                className="faq-question-btn"
              >
                <div className="faq-q-left">
                  <div className={`faq-icon-bubble ${isOpen ? 'active' : ''}`}>
                    <HelpCircle size={18} />
                  </div>
                  <span className="faq-question-text">{q}</span>
                </div>
                <div className={`faq-chevron ${isOpen ? 'rotated' : ''}`}>
                  <ChevronDown size={20} />
                </div>
              </button>

              {isOpen && (
                <div className="faq-answer-wrap">
                  <p className="faq-answer-text">{a}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default LandingFaq;
