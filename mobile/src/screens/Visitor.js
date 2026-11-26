import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { api, isNetworkError } from '../api';
import { cached } from '../offline';
import { useApp } from '../context';
import CalendarPicker from '../components/CalendarPicker';
import { formatLong } from '../dateutil';
import {
  Banner,
  Btn,
  C,
  Err,
  Field,
  Loading,
  Ok,
  pullControl,
  Qr,
  Receipt,
  Status,
  money,
  s,
  useRefresh,
} from '../ui';

const screenWidth = Dimensions.get('window').width;

const when = (iso) => (iso ? new Date(iso).toLocaleString() : '');
const offlineText = (t, r) => (r?.offline ? `${t('offlineBanner')} (${t('savedAt')} ${when(r.savedAt)})` : '');
const friendly = (t, e) => (isNetworkError(e) ? t('needsInternet') : e.message);

const fallbackCats = [
  { id: 1, key: 'student', name: { en: 'Student', am: 'ተማሪ' }, price: 50, onlineBookable: true, description: { en: 'Valid student ID required at gate.', am: 'በበር ላይ ተቀባይነት ያለው የተማሪ መታወቂያ ያስፈልጋል።' } },
  { id: 2, key: 'adult', name: { en: 'Adult / Teacher', am: 'አዋቂ / መምህር' }, price: 100, onlineBookable: true, description: { en: 'Resident adult admission.', am: 'የነዋሪ አዋቂ መግቢያ።' } },
  { id: 3, key: 'foreign_resident', name: { en: 'Foreign Resident', am: 'ነዋሪ የውጭ ዜጋ' }, price: 300, onlineBookable: true, description: { en: 'Proof of Ethiopian residency required.', am: 'የኢትዮጵያ ነዋሪነት ማረጋገጫ ያስፈልጋል።' } },
  { id: 4, key: 'non_resident', name: { en: 'Non-Resident (Tourist)', am: 'ነዋሪ ያልሆነ (ቱሪስት)' }, price: 500, onlineBookable: true, description: { en: 'International tourist admission.', am: 'ዓለም አቀፍ የቱሪስት መግቢያ።' } },
  { id: 5, key: 'exempt', name: { en: 'Exempt / Free (AAU staff)', am: 'ነጻ (የአዲስ አበባ ዩኒቨርሲቲ ሠራተኛ)' }, price: 0, onlineBookable: false, description: { en: 'Counter only, on presentation of ID.', am: 'በቆጣሪ ላይ ብቻ፣ መታወቂያ በማሳየት።' } },
];

export const specimensList = [
  {
    id: 'walia-ibex',
    nameEn: 'Walia Ibex',
    nameAm: 'ዋልያ',
    categoryEn: 'Mammal',
    categoryAm: 'አጥቢ እንስሳ',
    filter: 'mammal',
    descEn: 'Endemic wild mountain goat living exclusively in the high crags of the Simien Mountains National Park.',
    descAm: 'በስሜን ተራሮች ብሔራዊ ፓርክ ብቻ የሚገኝ ብርቅዬ የኢትዮጵያ የዱር ፍየል ዝርያ።',
    img: require('../../assets/gallery/walia-ibex.jpg'),
    endemic: true,
  },
  {
    id: 'nyala',
    nameEn: 'Mountain Nyala',
    nameAm: 'የደጋ ኒያላ',
    categoryEn: 'Mammal',
    categoryAm: 'አጥቢ እንስሳ',
    filter: 'mammal',
    descEn: 'Majestic spiral-horned antelope native to the high altitudes and heather of the Bale Mountains.',
    descAm: 'በባሌ ተራሮች ደጋማ ስፍራዎች ብቻ የሚገኝ ግርማ ሞገስ ያለው ብርቅዬ የአጋዘን ዝርያ።',
    img: require('../../assets/gallery/niyala.jpg'),
    endemic: true,
  },
  {
    id: 'hyena',
    nameEn: 'Spotted Hyena',
    nameAm: 'ጅብ',
    categoryEn: 'Mammal',
    categoryAm: 'አጥቢ እንስሳ',
    filter: 'mammal',
    descEn: 'Powerful carnivore specimen representing Ethiopia’s savanna and highland predator biodiversity.',
    descAm: 'የኢትዮጵያን የደጋና ቆላማ አካባቢዎች የአዳኝ እንስሳት ስነ-ምህዳር የሚወክል የተጠበቀ ናሙና።',
    img: require('../../assets/gallery/hayna.jpg'),
    endemic: false,
  },
  {
    id: 'goats-horn',
    nameEn: "Mountain Goat's Horn",
    nameAm: 'የተራራ ፍየል ቀንድ',
    categoryEn: 'Osteology',
    categoryAm: 'የአጥንት ቅርስ',
    filter: 'mammal',
    descEn: 'Preserved cranial and horn structure showcasing adaptation to high-altitude montane cliffs.',
    descAm: 'ለከፍተኛ ተራራማ አካባቢ ኑሮ የተስማማውን የራስ ቅልና የቀንድ ቅርጽ የሚያሳይ ሳይንሳዊ ናሙና።',
    img: require('../../assets/gallery/goats-horn.jpg'),
    endemic: false,
  },
  {
    id: 'insects',
    nameEn: 'Endemic Insects & Lepidoptera',
    nameAm: 'ነፍሳት እና ቢራቢሮዎች',
    categoryEn: 'Insects',
    categoryAm: 'ነፍሳት',
    filter: 'insect',
    descEn: 'Extensive entomological collection documenting beetles, butterflies, and pollinators of the Horn of Africa.',
    descAm: 'በአፍሪካ ቀንድ የሚገኙ ብርቅዬ ጥንዚዛዎችን፣ ቢራቢሮዎችንና ነፍሳትን የያዘ ሰፊ የስነ-ነፍሳት ማህደር።',
    img: require('../../assets/gallery/insects.jpg'),
    endemic: false,
  },
  {
    id: 'reptiles',
    nameEn: 'Rift Valley Serpents & Reptiles',
    nameAm: 'የስምጥ ሸለቆ እባቦችና ተሳቢዎች',
    categoryEn: 'Reptiles',
    categoryAm: 'ተሳቢ እንስሳት',
    filter: 'reptile',
    descEn: 'Preserved specimens of venomous and non-venomous reptiles from the Great Rift Valley basin.',
    descAm: 'ከታላቁ የስምጥ ሸለቆ ተፋሰስ የተሰበሰቡ መርዛማና መርዛማ ያልሆኑ የተሳቢ እንስሳት ናሙናዎች።',
    img: require('../../assets/gallery/reptiles.jpg'),
    endemic: false,
  },
  {
    id: 'tortoise-reptiles',
    nameEn: 'Leopard Tortoise & Lizards',
    nameAm: 'የነብር ዔሊ እና እንሽላሊቶች',
    categoryEn: 'Reptiles',
    categoryAm: 'ተሳቢ እንስሳት',
    filter: 'reptile',
    descEn: 'Ancient chelonian taxidermy display alongside regional monitor lizards and agamas.',
    descAm: 'የዔሊዎችና የተለያዩ የአገር በቀል እንሽላሊቶች የተጠበቀ ማሳያ።',
    img: require('../../assets/gallery/tortoise-reptailes.jpg'),
    endemic: false,
  },
];

const faqData = [
  {
    qEn: 'Can I book for schools, colleges, or educational delegations?',
    qAm: 'ለትምህርት ቤቶች፣ ኮሌጆች ወይም የትምህርት ቡድኖች መያዝ ይቻላል?',
    aEn: 'Yes! Select "School / Institution" when booking. You will be asked for your institution’s name and 10-digit Tax Identification Number (TIN) to generate the official institutional receipt. Both guided and self-guided options are available.',
    aAm: 'አዎ! ቦታ በሚይዙበት ጊዜ "የትምህርት ቤት / ተቋም" የሚለውን ይምረጡ። ይፋዊ ደረሰኝ ለማዘጋጀት የተቋምዎ ስም እና ባለ 10 አሃዝ የግብር ከፋይ መለያ ቁጥር (TIN) ይጠየቃሉ። የመመራት ወይም በራስ መመራት ጉብኝት መምረጥ ይቻላል።',
  },
  {
    qEn: 'How does the digital QR ticket work at the museum gate?',
    qAm: 'ዲጂታል የQR ትኬቱ በሙዚየሙ መግቢያ በር ላይ እንዴት ይሰራል?',
    aEn: 'Once your payment is verified, your visitor account displays an authentic, security-signed QR ticket. Show this QR ticket on your phone at Arat Kilo Campus. The gate scanner records visitor admissions instantly.',
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
    aEn: 'Yes! Guided tours are led by University zoological staff and subject to slot availability. You can choose an available time slot during booking (09:00, 10:30, 13:00, 14:30) for only +50 ETB surcharge.',
    aAm: 'አዎ! የተመሩ ጉብኝቶች በዩኒቨርሲቲው የዙኦሎጂ ባለሙያዎች የሚመሩ ሲሆን በቦታ ማስያዣ ጊዜ የሚገኝ ሰዓት (09:00, 10:30, 13:00, 14:30) በሰው +50 ብር ብቻ መምረጥ ይቻላል።',
  },
];

export function Home({ navigation }) {
  const { t, pick, user, lang } = useApp();
  const am = lang === 'am';
  const [res, setRes] = useState(null);
  const [userBookings, setUserBookings] = useState([]);
  const [activeGalleryTab, setActiveGalleryTab] = useState('all');
  const [selectedSpecimen, setSelectedSpecimen] = useState(null);
  const [openFaq, setOpenFaq] = useState(0);

  const load = useCallback(() => {
    cached('categories', async () => (await api('/categories')).categories)
      .then(setRes)
      .catch((e) => console.warn('[Home] categories error:', e.message));

    if (user?.role === 'visitor') {
      api('/bookings')
        .then((r) => setUserBookings(r.bookings || []))
        .catch(() => {});
    }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const pull = useRefresh(load);

  const displayCats = (res?.data && res.data.length > 0) ? res.data : fallbackCats;

  const filteredSpecimens = useMemo(() => {
    if (activeGalleryTab === 'all') return specimensList;
    return specimensList.filter((s) => s.filter === activeGalleryTab);
  }, [activeGalleryTab]);

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 50 }]} refreshControl={pullControl(pull)}>
      <Banner>{offlineText(t, res)}</Banner>

      {/* Hero Presentation Card - AAU Deep Navy Blue (#013859) with Gold Accent */}
      <View
        style={{
          backgroundColor: '#013859',
          borderRadius: 16,
          padding: 20,
          marginBottom: 16,
          shadowColor: '#01273d',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 4,
        }}
      >
        <View style={{ backgroundColor: 'rgba(242, 166, 43, 0.2)', borderWidth: 1, borderColor: '#f2a62b', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 10 }}>
          <Text style={{ color: '#fef08a', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>
            ✦ {am ? 'የአዲስ አበባ ዩኒቨርሲቲ ሙዚየም' : 'ADDIS ABABA UNIVERSITY'}
          </Text>
        </View>

        <Text style={{ fontSize: 24, fontWeight: '900', color: '#ffffff', letterSpacing: -0.4, marginBottom: 6 }}>
          {am ? 'የዙኦሎጂ የተፈጥሮ ታሪክ ሙዚየም' : 'Zoological Natural History Museum'}
        </Text>

        <Text style={{ fontSize: 14, fontWeight: '700', color: '#7dd3fc', marginBottom: 10 }}>
          {am ? 'የኢትዮጵያን የተፈጥሮ ቅርሶች በአንድነት የያዘ' : 'Preserving Ethiopia’s Living Heritage'}
        </Text>

        <Text style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 20, marginBottom: 18 }}>
          {am
            ? 'ከኢትዮጵያ የዱር እንስሳት ስብስብ የተጠበቁ አጥቢ እንስሳትን፣ ወፎችን፣ ተሳቢዎችንና ነፍሳትን ይወቁ። በአዲስ አበባ ዩኒቨርሲቲ የተጠበቀ ብሔራዊ ቅርስ።'
            : 'Discover preserved mammals, birds, reptiles, and insects from Ethiopia’s diverse wildlife collection curated at Arat Kilo Campus.'}
        </Text>

        {/* CTA Buttons - Gold (#f2a62b) and Outline */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
          <Pressable
            onPress={() => navigation.navigate(user ? 'Book' : 'Login')}
            style={{
              flex: 1,
              backgroundColor: '#f2a62b',
              borderRadius: 10,
              paddingVertical: 12,
              paddingHorizontal: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Ionicons name="ticket" size={17} color="#01273d" />
            <Text style={{ color: '#01273d', fontWeight: '800', fontSize: 14 }}>
              {am ? 'ትኬት ይቁረጡ' : 'Book a Visit'}
            </Text>
            <Ionicons name="arrow-forward" size={15} color="#01273d" />
          </Pressable>
        </View>

        {/* Hero Quick Feature Chips */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[
            { icon: 'qr-code-outline', text: am ? 'ፈጣን QR ትኬት' : 'Instant Digital QR' },
            { icon: 'compass-outline', text: am ? 'የተመራ ጉብኝት' : 'Guided Tours' },
            { icon: 'card-outline', text: am ? 'ቴሌብርና ሲቢኢ' : 'Telebirr & CBE' },
            { icon: 'time-outline', text: am ? 'ሰኞ - ቅዳሜ 8:30 - 5:30' : 'Mon-Sat 8:30-5:30' },
          ].map((chip, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: 'rgba(255, 255, 255, 0.14)',
                paddingHorizontal: 9,
                paddingVertical: 5,
                borderRadius: 20,
              }}
            >
              <Ionicons name={chip.icon} size={12} color="#7dd3fc" />
              <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '600' }}>{chip.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Active Bookings Notice */}
      {user && userBookings.length > 0 && (
        <Pressable
          onPress={() => navigation.navigate('Bookings')}
          style={{
            backgroundColor: '#e0f2fe',
            borderWidth: 1.5,
            borderColor: '#7dd3fc',
            borderRadius: 14,
            padding: 14,
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#015484', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="ticket" size={20} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#013859' }}>
              {am ? 'የእርስዎ ትኬቶች እና ቦታ ማስያዣዎች' : 'Your Digital Tickets & Passes'}
            </Text>
            <Text style={{ fontSize: 12, color: '#0284c7' }}>
              {am
                ? `${userBookings.length} ቦታ ማስያዣ(ዎች) ተገኝተዋል። ዲጂታል የQR ትኬትዎን ይመልከቱ →`
                : `${userBookings.length} active pass(es) ready. Tap to view your gate QR →`}
            </Text>
          </View>
        </Pressable>
      )}

      {/* Specimen Exhibition Gallery */}
      <View style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <View>
            <Text style={[s.h2, { fontSize: 18, marginBottom: 2 }]}>
              {am ? 'የተፈጥሮ ታሪክ ስብስቦች' : 'Specimen Exhibition Gallery'}
            </Text>
            <Text style={[s.muted, { fontSize: 12 }]}>
              {am ? 'በአራት ኪሎ ካምፓስ የተጠበቁ የኢትዮጵያ ብርቅዬ ቅርሶች' : 'Curated biodiversity specimens preserved at AAU CNCS'}
            </Text>
          </View>
        </View>

        {/* Gallery Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginVertical: 12 }}>
          {[
            { id: 'all', label: am ? 'ሁሉም ስብስቦች' : 'All Exhibits' },
            { id: 'mammal', label: am ? 'አጥቢ እንስሳት' : 'Mammals' },
            { id: 'reptile', label: am ? 'ተሳቢዎች' : 'Reptiles' },
            { id: 'insect', label: am ? 'ነፍሳት' : 'Insects' },
          ].map((tab) => (
            <Pressable
              key={tab.id}
              onPress={() => setActiveGalleryTab(tab.id)}
              style={{
                paddingVertical: 7,
                paddingHorizontal: 14,
                borderRadius: 20,
                backgroundColor: activeGalleryTab === tab.id ? C.teal : '#ffffff',
                borderWidth: 1,
                borderColor: activeGalleryTab === tab.id ? C.teal : '#e2e8f0',
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: activeGalleryTab === tab.id ? '#ffffff' : C.soft,
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Specimen Cards Horizontal List */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingRight: 8 }}>
          {filteredSpecimens.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setSelectedSpecimen(item)}
              style={{
                width: screenWidth * 0.72,
                backgroundColor: '#ffffff',
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                overflow: 'hidden',
                shadowColor: '#013859',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 5,
                elevation: 3,
              }}
            >
              <View style={{ height: 145, backgroundColor: '#f1f5f9', position: 'relative' }}>
                <Image
                  source={item.img}
                  style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                />
                <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: item.endemic ? '#f2a62b' : C.teal, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
                  <Text style={{ color: item.endemic ? '#01273d' : '#ffffff', fontSize: 10, fontWeight: '800' }}>
                    {item.endemic ? (am ? '★ ብርቅዬ' : '★ Endemic') : (am ? item.categoryAm : item.categoryEn)}
                  </Text>
                </View>
                <View style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(1, 39, 61, 0.7)', padding: 4, borderRadius: 14 }}>
                  <Ionicons name="expand-outline" size={14} color="#ffffff" />
                </View>
              </View>

              <View style={{ padding: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: C.ink, marginBottom: 2 }}>
                  {am ? item.nameAm : item.nameEn}
                </Text>
                <Text style={{ fontSize: 12, color: C.teal, fontWeight: '600', marginBottom: 4 }}>
                  {am ? item.nameEn : item.nameAm}
                </Text>
                <Text numberOfLines={2} style={{ fontSize: 12, color: C.soft, lineHeight: 17, marginBottom: 8 }}>
                  {am ? item.descAm : item.descEn}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: C.teal }}>
                  {am ? 'ዝርዝር መረጃ ይመልከቱ →' : 'View Specimen Details →'}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Official Admission Pricing Catalog */}
      <View style={{ marginBottom: 24 }}>
        <Text style={[s.h2, { fontSize: 18, marginBottom: 2 }]}>
          {am ? 'ይፋዊ የመግቢያ ትኬት ዋጋዎች' : 'Official Admission Pricing & Tickets'}
        </Text>
        <Text style={[s.muted, { fontSize: 12, marginBottom: 12 }]}>
          {am ? 'የአዲስ አበባ ዩኒቨርሲቲ የፀደቁ ይፋዊ ተመኖች' : 'Standard institutional rates approved by Addis Ababa University'}
        </Text>

        <View style={{ gap: 10 }}>
          {displayCats.map((c) => {
            const isStudent = (c.key === 'student') || (c.name?.en || '').toLowerCase().includes('student');
            const isFree = c.price === 0;

            return (
              <View
                key={c.id || c.key}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: isStudent ? '#7dd3fc' : '#e2e8f0',
                  padding: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 3,
                  elevation: 1,
                }}
              >
                <View style={{ flex: 1, marginRight: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink }}>
                      {pick(c.name)}
                    </Text>
                    {isStudent && (
                      <View style={{ backgroundColor: '#e0f2fe', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: C.teal }}>
                          {am ? 'ቅናሽ' : 'SPECIAL RATE'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 12, color: C.muted, lineHeight: 16 }}>
                    {c.description ? pick(c.description) : (am ? 'ሙሉ የሙዚየም ጉብኝት' : 'Access to all museum exhibitions')}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: isFree ? C.soft : C.teal }}>
                    {isFree ? (am ? 'ነፃ' : 'Free') : `${money(c.price)} ETB`}
                  </Text>
                  {c.onlineBookable ? (
                    <Pressable
                      onPress={() => navigation.navigate(user ? 'Book' : 'Login')}
                      style={{
                        backgroundColor: '#e0f2fe',
                        borderWidth: 1,
                        borderColor: '#7dd3fc',
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: C.teal }}>
                        {am ? 'ይምረጡ' : 'Select'}
                      </Text>
                    </Pressable>
                  ) : (
                    <Text style={{ fontSize: 10, color: C.brick, fontWeight: '600' }}>
                      {am ? 'በበር ላይ ብቻ' : 'Gate Only'}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Guided Tour Highlight Card - Sky Blue Tone */}
      <View
        style={{
          backgroundColor: '#f0f9ff',
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: '#bae6fd',
          padding: 16,
          marginBottom: 24,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#0284c7', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="sparkles" size={18} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#013859' }}>
              {am ? 'የዩኒቨርሲቲ ምሁራን የተመራ ጉብኝት' : 'University Docent Guided Tours'}
            </Text>
            <Text style={{ fontSize: 11, color: '#0284c7', fontWeight: '700' }}>
              {am ? 'በሰው +50 ብር ተጨማሪ ብቻ' : 'Only +50 ETB surcharge per attendee'}
            </Text>
          </View>
        </View>

        <Text style={{ fontSize: 13, color: '#0369a1', lineHeight: 19, marginBottom: 12 }}>
          {am
            ? 'ከአዲስ አበባ ዩኒቨርሲቲ የዙኦሎጂ ባለሙያዎች ጋር በመሆን የኢትዮጵያን ስነ-ህይወት፣ ዝርያዎችና ታሪክ በጥልቀት ይረዱ።'
            : 'Gain in-depth scientific insights led by university zoologists. Select your preferred departure time slot during booking.'}
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {['09:00 AM', '10:30 AM', '01:00 PM', '02:30 PM'].map((tSlot) => (
            <View key={tSlot} style={{ backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#7dd3fc', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="time-outline" size={12} color="#0284c7" />
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#015484' }}>{tSlot}</Text>
            </View>
          ))}
        </View>

        <Btn
          title={am ? 'ትኬት ይቁረጡ (Book a Visit)' : 'Book a Visit'}
          onPress={() => navigation.navigate(user ? 'Book' : 'Login')}
        />
      </View>

      {/* Visitor FAQ Accordion */}
      <View style={{ marginBottom: 24 }}>
        <Text style={[s.h2, { fontSize: 18, marginBottom: 2 }]}>
          {am ? 'ተደጋግመው የሚጠየቁ ጥያቄዎች' : 'Frequently Asked Visitor Questions'}
        </Text>
        <Text style={[s.muted, { fontSize: 12, marginBottom: 12 }]}>
          {am ? 'የጉብኝት ደንቦች፣ ክፍያዎችና ትኬቶች' : 'Rules, gate validation, rescheduling and payments'}
        </Text>

        <View style={{ gap: 8 }}>
          {faqData.map((item, idx) => {
            const isOpen = openFaq === idx;
            const q = am ? item.qAm : item.qEn;
            const a = am ? item.aAm : item.aEn;

            return (
              <View
                key={idx}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: isOpen ? '#7dd3fc' : '#e2e8f0',
                  overflow: 'hidden',
                }}
              >
                <Pressable
                  onPress={() => setOpenFaq(isOpen ? null : idx)}
                  style={{
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <Ionicons
                      name="help-circle"
                      size={18}
                      color={isOpen ? C.teal : C.muted}
                    />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink, flex: 1 }}>
                      {q}
                    </Text>
                  </View>
                  <Ionicons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={C.muted}
                  />
                </Pressable>

                {isOpen && (
                  <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 2, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                    <Text style={{ fontSize: 13, color: C.soft, lineHeight: 19 }}>
                      {a}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* AAU CNCS Academic Footer Card - Deep Navy (#013859) */}
      <View
        style={{
          backgroundColor: '#013859',
          borderRadius: 16,
          padding: 18,
          borderWidth: 1,
          borderColor: '#015484',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Image
            source={require('../../assets/aau-logo.png')}
            style={{ width: 36, height: 36, resizeMode: 'contain' }}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 14 }}>
              {am ? 'የዙኦሎጂ የተፈጥሮ ታሪክ ሙዚየም' : 'Zoological Natural History Museum'}
            </Text>
            <Text style={{ color: '#7dd3fc', fontSize: 11 }}>
              {am ? 'አዲስ አበባ ዩኒቨርሲቲ · የተፈጥሮ ሳይንስ' : 'Addis Ababa University · CNCS'}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginBottom: 14 }}>
          <Ionicons name="shield-checkmark" size={15} color="#38bdf8" />
          <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>
            {am ? 'ይፋዊ የአዲስ አበባ ዩኒቨርሲቲ መድረክ' : 'Official AAU Verified Platform'}
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <Ionicons name="location-outline" size={15} color="#7dd3fc" style={{ marginTop: 2 }} />
            <Text style={{ color: '#e2e8f0', fontSize: 12, flex: 1, lineHeight: 17 }}>
              {am
                ? 'አዲስ አበባ ዩኒቨርሲቲ፣ አራት ኪሎ ካምፓስ፣ የተፈጥሮና ኮምፒውቲንግ ሳይንስ ኮሌጅ፣ ኪንግ ጆርጅ 6ኛ ጎዳና'
                : 'College of Natural & Computational Sciences, King George VI St, Arat Kilo Campus, Addis Ababa'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="time-outline" size={15} color="#7dd3fc" />
            <Text style={{ color: '#e2e8f0', fontSize: 12 }}>
              {am ? 'ሰኞ – ቅዳሜ፦ 8:30 ጠዋት – 5:30 ከሰዓት' : 'Monday – Saturday: 8:30 AM – 5:30 PM'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="call-outline" size={15} color="#7dd3fc" />
            <Text style={{ color: '#e2e8f0', fontSize: 12 }}>+251 11 123 9700</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="mail-outline" size={15} color="#7dd3fc" />
            <Text style={{ color: '#e2e8f0', fontSize: 12 }}>info@museum.aau.edu.et</Text>
          </View>
        </View>
      </View>

      {/* Specimen Detail Modal */}
      <Modal visible={!!selectedSpecimen} transparent animationType="fade" onRequestClose={() => setSelectedSpecimen(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(1, 39, 61, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 16, width: '100%', maxWidth: 400, overflow: 'hidden' }}>
            {selectedSpecimen && (
              <>
                <View style={{ height: 220, position: 'relative' }}>
                  <Image source={selectedSpecimen.img} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                  <Pressable
                    onPress={() => setSelectedSpecimen(null)}
                    style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(1, 39, 61, 0.7)', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="close" size={20} color="#ffffff" />
                  </Pressable>
                  <View style={{ position: 'absolute', bottom: 10, left: 10, backgroundColor: selectedSpecimen.endemic ? '#f2a62b' : C.teal, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                    <Text style={{ color: selectedSpecimen.endemic ? '#01273d' : '#ffffff', fontSize: 11, fontWeight: '800' }}>
                      {selectedSpecimen.endemic ? (am ? '★ ብርቅዬ የኢትዮጵያ ዝርያ' : '★ Endemic Ethiopian Species') : (am ? selectedSpecimen.categoryAm : selectedSpecimen.categoryEn)}
                    </Text>
                  </View>
                </View>

                <View style={{ padding: 18 }}>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: C.ink, marginBottom: 2 }}>
                    {am ? selectedSpecimen.nameAm : selectedSpecimen.nameEn}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: C.teal, marginBottom: 12 }}>
                    {am ? selectedSpecimen.nameEn : selectedSpecimen.nameAm}
                  </Text>
                  <Text style={{ fontSize: 14, color: C.soft, lineHeight: 21, marginBottom: 18 }}>
                    {am ? selectedSpecimen.descAm : selectedSpecimen.descEn}
                  </Text>

                  <Btn
                    title={am ? 'ይህንን ናሙና ለመጎብኘት ትኬት ይቁረጡ' : 'Book Visit to View Specimen'}
                    onPress={() => {
                      setSelectedSpecimen(null);
                      navigation.navigate(user ? 'Book' : 'Login');
                    }}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

export function Book({ navigation }) {
  const { t, pick, user, lang } = useApp();
  const am = lang === 'am';
  const [cats, setCats] = useState(null);
  const [avail, setAvail] = useState(null);
  const [kind, setKind] = useState('individual');
  const [date, setDate] = useState('');
  const [qty, setQty] = useState({});
  const [guided, setGuided] = useState(false);
  const [slot, setSlot] = useState('10:30');
  const [grp, setGrp] = useState({ organization: '', tin: '', contactName: '', contactPhone: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => Promise.all([
    cached('categories', async () => (await api('/categories')).categories)
      .then((r) => setCats(r.data.filter((c) => c.onlineBookable)))
      .catch((e) => setErr(friendly(t, e))),
    api('/availability').then(setAvail).catch(() => {}),
  ]), [t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const pull = useRefresh(load);

  const baseTotal = useMemo(() => (cats || []).reduce((sum, c) => sum + c.price * (qty[c.id] || 0), 0), [cats, qty]);
  const surchargeTotal = useMemo(() => (guided ? (cats || []).reduce((sum, c) => (c.price > 0 ? sum + 50 * (qty[c.id] || 0) : sum), 0) : 0), [guided, cats, qty]);
  const total = baseTotal + surchargeTotal;

  const lines = (cats || []).filter((c) => qty[c.id] > 0).map((c) => ({ categoryId: c.id, quantity: qty[c.id] }));
  const closed = avail?.closedDates?.includes(date);
  const bump = (id, d) => setQty({ ...qty, [id]: Math.max(0, Math.min(500, (qty[id] || 0) + d)) });

  const submit = async () => {
    setErr('');
    setBusy(true);
    try {
      const r = await api(kind === 'group' ? '/bookings/group' : '/bookings', {
        method: 'POST',
        body: {
          visitDate: date,
          lines,
          isGuided: guided,
          timeSlot: guided ? slot : null,
          ...(kind === 'group' ? grp : {}),
        },
      });
      setQty({});
      navigation.navigate('Bookings', { screen: 'BookingDetail', params: { id: r.booking.id } });
    } catch (e) {
      setErr(friendly(t, e));
    } finally {
      setBusy(false);
    }
  };

  if (!cats) return err ? <Text style={s.err}>{err}</Text> : <Loading />;

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled" refreshControl={pullControl(pull)}>
      {/* Visit Type Segment Selector */}
      <View style={{ flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 10, padding: 4, marginBottom: 14 }}>
        <Pressable
          onPress={() => setKind('individual')}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 8,
            backgroundColor: kind === 'individual' ? '#ffffff' : 'transparent',
            alignItems: 'center',
            shadowColor: kind === 'individual' ? '#000' : 'transparent',
            shadowOpacity: 0.08,
            shadowRadius: 2,
            elevation: kind === 'individual' ? 2 : 0,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="person" size={14} color={kind === 'individual' ? C.teal : C.muted} />
            <Text style={{ fontWeight: '700', fontSize: 13, color: kind === 'individual' ? C.teal : C.muted }}>
              {am ? 'የግል / ቤተሰብ' : 'Individual / Family'}
            </Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => setKind('group')}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 8,
            backgroundColor: kind === 'group' ? '#ffffff' : 'transparent',
            alignItems: 'center',
            shadowColor: kind === 'group' ? '#000' : 'transparent',
            shadowOpacity: 0.08,
            shadowRadius: 2,
            elevation: kind === 'group' ? 2 : 0,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="school" size={14} color={kind === 'group' ? C.teal : C.muted} />
            <Text style={{ fontWeight: '700', fontSize: 13, color: kind === 'group' ? C.teal : C.muted }}>
              {am ? 'የትምህርት ቤት / ተቋም' : 'School / Institution'}
            </Text>
          </View>
        </Pressable>
      </View>

      <Err>{err}</Err>
      <Err>{closed ? t('closedDate') : ''}</Err>

      {/* Step 1: Visit Mode (Guided vs Self-Guided) */}
      <View style={s.card}>
        <Text style={[s.label, { marginBottom: 8 }]}>
          {am ? '1. የጉብኝት ሁኔታ ይምረጡ' : '1. Select Experience Mode'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
          <Pressable
            onPress={() => setGuided(false)}
            style={{
              flex: 1,
              paddingVertical: 12,
              paddingHorizontal: 10,
              borderRadius: 10,
              backgroundColor: !guided ? '#e0f2fe' : '#f8fafc',
              borderWidth: 1.5,
              borderColor: !guided ? '#015484' : '#e2e8f0',
              alignItems: 'center',
            }}
          >
            <Ionicons name="walk" size={20} color={!guided ? '#013859' : '#64748b'} />
            <Text style={{ fontWeight: '800', fontSize: 13, color: !guided ? '#013859' : '#64748b', marginTop: 4 }}>
              {am ? 'ራሱን የቻለ' : 'Self-Guided'}
            </Text>
            <Text style={{ fontSize: 11, color: !guided ? '#015484' : '#94a3b8' }}>
              {am ? 'መደበኛ መግቢያ' : 'Standard'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setGuided(true)}
            style={{
              flex: 1,
              paddingVertical: 12,
              paddingHorizontal: 10,
              borderRadius: 10,
              backgroundColor: guided ? '#e0f2fe' : '#f8fafc',
              borderWidth: 1.5,
              borderColor: guided ? '#015484' : '#e2e8f0',
              alignItems: 'center',
            }}
          >
            <Ionicons name="sparkles" size={20} color={guided ? '#013859' : '#64748b'} />
            <Text style={{ fontWeight: '800', fontSize: 13, color: guided ? '#013859' : '#64748b', marginTop: 4 }}>
              {am ? 'የተመራ ጉብኝት' : 'Guided Tour'}
            </Text>
            <Text style={{ fontSize: 11, color: guided ? '#0284c7' : '#94a3b8', fontWeight: '700' }}>
              +50 ETB / person
            </Text>
          </Pressable>
        </View>

        {guided && (
          <View style={{ backgroundColor: '#f0f9ff', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#bae6fd', marginTop: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#013859', marginBottom: 8 }}>
              {am ? 'የመነሻ ሰዓት ይምረጡ (Departure Time Slot):' : 'Select Departure Time Slot:'}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {['09:00', '10:30', '13:00', '14:30'].map((time) => (
                <Pressable
                  key={time}
                  onPress={() => setSlot(time)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 8,
                    backgroundColor: slot === time ? '#013859' : '#ffffff',
                    borderWidth: 1,
                    borderColor: slot === time ? '#013859' : '#cbd5e1',
                  }}
                >
                  <Text style={{ color: slot === time ? '#ffffff' : '#334155', fontWeight: '700', fontSize: 12 }}>
                    {time}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Step 2: Date Picker */}
      <View style={s.card}>
        <Text style={[s.label, { marginBottom: 8 }]}>
          {am ? '2. የጉብኝት ቀን ይምረጡ' : '2. Select Visit Date'}
        </Text>
        <CalendarPicker value={date} onChange={setDate} min={avail?.today} max={avail?.maxDate} closed={avail?.closedDates} today={avail?.today} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <Ionicons name={date ? 'calendar-sharp' : 'information-circle-outline'} size={16} color={date ? '#0284c7' : C.muted} />
          <Text style={{ fontSize: 13, fontWeight: date ? '700' : '500', color: date ? '#015484' : C.muted }}>
            {date ? `${formatLong(date, lang)}` : (am ? 'እባክዎ ከቀን መቁጠሪያው ቀን ይምረጡ' : 'Please select a date from above')}
          </Text>
        </View>
      </View>

      {/* Step 3: School/Institutional Information (If Group) */}
      {kind === 'group' && (
        <View style={s.card}>
          <Text style={[s.label, { marginBottom: 8 }]}>
            {am ? '3. የተቋሙ መረጃ' : '3. Institutional Details'}
          </Text>
          <Field
            label={t('organization')}
            value={grp.organization}
            onChangeText={(v) => setGrp({ ...grp, organization: v })}
            autoCapitalize="words"
            placeholder="e.g. Addis Ababa Secondary School"
          />
          <Field
            label={am ? 'የተቋሙ TIN ቁጥር (10 አሃዝ)' : 'Taxpayer TIN (10 digits)'}
            value={grp.tin}
            onChangeText={(v) => setGrp({ ...grp, tin: v })}
            keyboardType="number-pad"
            maxLength={10}
            placeholder="0012345678"
          />
          <Field
            label={am ? 'የተጠሪ / መሪ ስም' : 'Coordinator Name'}
            value={grp.contactName}
            onChangeText={(v) => setGrp({ ...grp, contactName: v })}
            autoCapitalize="words"
            placeholder="Teacher / Representative"
          />
          <Field
            label={am ? 'የተጠሪ ስልክ ቁጥር' : 'Contact Phone'}
            value={grp.contactPhone}
            onChangeText={(v) => setGrp({ ...grp, contactPhone: v })}
            keyboardType="phone-pad"
            placeholder="+251911..."
          />
        </View>
      )}

      {/* Step 4: Category Ticket Quantities */}
      <View style={s.card}>
        <Text style={[s.label, { marginBottom: 8 }]}>
          {kind === 'group' ? (am ? '4. የጎብኚዎች ብዛት' : '4. Attendee Breakdown') : (am ? '3. የትኬት ብዛት ይምረጡ' : '3. Select Ticket Quantities')}
        </Text>

        {cats.map((c) => {
          const itemPrice = c.price + (guided && c.price > 0 ? 50 : 0);
          const currentCount = qty[c.id] || 0;

          return (
            <View
              key={c.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#f1f5f9',
              }}
            >
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: C.ink }}>
                  {pick(c.name)}
                </Text>
                <Text style={{ fontSize: 12, color: C.muted }}>
                  {money(itemPrice)} ETB / person {guided && c.price > 0 ? '(incl. +50 guide)' : ''}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Pressable
                  accessibilityLabel="minus"
                  onPress={() => bump(c.id, -1)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    backgroundColor: currentCount > 0 ? '#e2e8f0' : '#f8fafc',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="remove" size={18} color={currentCount > 0 ? C.ink : '#cbd5e1'} />
                </Pressable>

                <Text style={{ minWidth: 28, textAlign: 'center', fontSize: 16, fontWeight: '800', color: C.ink }}>
                  {currentCount}
                </Text>

                <Pressable
                  accessibilityLabel="plus"
                  onPress={() => bump(c.id, 1)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    backgroundColor: C.teal,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="add" size={18} color="#ffffff" />
                </Pressable>
              </View>
            </View>
          );
        })}

        {/* Pricing Summary Breakdown */}
        <View style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 10, marginTop: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: 13, color: C.soft }}>{am ? 'የመግቢያ ትኬቶች ድምር' : 'Base Admission Tickets:'}</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: C.ink }}>{money(baseTotal)} ETB</Text>
          </View>
          {guided && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 13, color: '#0284c7' }}>{am ? 'የተመራ ጉብኝት ክፍያ (+50)' : 'Guided Tour Docent Fee:'}</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0284c7' }}>+{money(surchargeTotal)} ETB</Text>
            </View>
          )}
          <View style={{ height: 1, backgroundColor: '#e2e8f0', marginVertical: 8 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: C.ink }}>{t('total')}:</Text>
            <Text style={{ fontSize: 20, fontWeight: '900', color: C.teal }}>{money(total)} ETB</Text>
          </View>
        </View>
      </View>

      {/* Confirmation Button */}
      <Btn
        title={t('confirm') + ` · ${money(total)} ETB`}
        onPress={submit}
        disabled={busy || !lines.length || !date || closed || !user}
        icon={<Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />}
      />
    </ScrollView>
  );
}

export function MyBookings({ navigation }) {
  const { t, lang } = useApp();
  const am = lang === 'am';
  const [res, setRes] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRes(await cached('bookings', async () => (await api('/bookings')).bookings));
    } catch {
      setRes({ data: [] });
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!res) return <Loading />;

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.pad, { paddingBottom: 40 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      <Banner>{offlineText(t, res)}</Banner>

      <Text style={[s.muted, { fontSize: 13, marginBottom: 12 }]}>
        {am ? 'የእርስዎ ዲጂታል ትኬቶችና የመግቢያ ፓሶች' : 'Your digital tickets and gate passes for entry'}
      </Text>

      {!res.data.length && (
        <View style={[s.card, { alignItems: 'center', paddingVertical: 40 }]}>
          <Ionicons name="ticket-outline" size={48} color="#cbd5e1" />
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink, marginTop: 12, marginBottom: 4 }}>
            {am ? 'ምንም አይነት ትኬት አልተገኘም' : 'No bookings found'}
          </Text>
          <Text style={[s.muted, { textAlign: 'center', marginBottom: 16 }]}>
            {am ? 'ለመጎብኘት አዲስ ትኬት ይቁረጡ' : 'Book a visit to explore Ethiopia’s natural history'}
          </Text>
          <Btn title={am ? 'ትኬት ይቁረጡ' : 'Book Now'} onPress={() => navigation.navigate('Book')} />
        </View>
      )}

      {res.data.map((b) => (
        <Pressable
          key={b.id}
          style={[
            s.card,
            {
              borderLeftWidth: 4,
              borderLeftColor: b.isGuided ? '#f2a62b' : C.teal,
            },
          ]}
          onPress={() => navigation.navigate('BookingDetail', { id: b.id })}
        >
          <View style={[s.row, { marginBottom: 6 }]}>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: C.ink, letterSpacing: 0.5 }}>
                {b.ref}
              </Text>
              <Text style={{ fontSize: 12, color: C.muted }}>
                {b.visitDate}{b.organization ? ` · ${b.organization}` : ''}
              </Text>
            </View>
            <Status value={b.status} t={t} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name={b.isGuided ? 'sparkles' : 'walk'} size={14} color={b.isGuided ? '#b45309' : C.teal} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: b.isGuided ? '#b45309' : C.teal }}>
                {b.isGuided ? `Guided (${b.timeSlot || '09:00'})` : 'Self-Guided'}
              </Text>
            </View>
            <Text style={{ fontSize: 15, fontWeight: '900', color: C.teal }}>
              {money(b.amount)} ETB
            </Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function BookingDetail({ route, navigation }) {
  const { id } = route.params;
  const { t, pick, user, lang } = useApp();
  const am = lang === 'am';
  const [res, setRes] = useState(null);
  const [rcpt, setRcpt] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [showResched, setShowResched] = useState(false);
  const [avail, setAvail] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await cached(`booking:${id}`, async () => (await api(`/bookings/${id}`)).booking);
      setRes(r);
      if (r.data.tempReceiptNo) {
        setRcpt(await cached(`receipt:${id}`, async () => (await api(`/bookings/${id}/receipt`)).receipt).catch(() => null));
      }
    } catch (e) {
      setErr(friendly(t, e));
    }
  }, [id, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const pull = useRefresh(load);

  const act = (fn) => async () => {
    setErr('');
    setMsg('');
    try {
      await fn();
      await load();
    } catch (e) {
      setErr(friendly(t, e));
    }
  };

  const pay = act(async () => {
    const returnUrl = Linking.createURL(`booking/${id}`);
    const { checkoutUrl } = await api(`/bookings/${id}/pay`, { method: 'POST', body: { returnUrl } });
    await WebBrowser.openAuthSessionAsync(checkoutUrl, returnUrl);
    setMsg(t('payWait'));
    for (let i = 0; i < 8; i++) {
      const r = await api(`/bookings/${id}/payment-status`);
      if (r.status !== 'AwaitingPayment') {
        setMsg(t('paySuccess'));
        return;
      }
      if (r.outcome === 'failed') {
        setMsg('');
        throw new Error(t('payFail'));
      }
      await new Promise((ok) => setTimeout(ok, 1500));
    }
    setMsg(t('payStillPending'));
  });

  const cancel = act(async () => {
    await api(`/bookings/${id}/cancel`, { method: 'POST' });
  });

  const resched = act(async () => {
    await api(`/bookings/${id}/reschedule`, { method: 'POST', body: { visitDate: newDate } });
    setNewDate('');
    setShowResched(false);
  });

  const openResched = async () => {
    setShowResched(!showResched);
    if (!avail) {
      try {
        setAvail(await api('/availability'));
      } catch {
        setAvail({ closedDates: [] });
      }
    }
  };

  const refund = act(async () => {
    await api(`/bookings/${id}/refund-request`, { method: 'POST' });
    setMsg(t('refunded'));
  });

  if (!res) return err ? <Text style={s.err}>{err}</Text> : <Loading />;

  const b = res.data;
  const mine = user?.role === 'visitor';
  const shortfall = b.status === 'Visited' ? b.amount - (b.attendedAmount || 0) : 0;
  const paid = b.status === 'Pending';
  const fee = b.aggregatorFee || 0;
  const attendanceProgress = b.bookedQuantity > 0 ? Math.min(100, Math.round(((b.attendedQuantity || 0) / b.bookedQuantity) * 100)) : 0;

  const confirmCancel = () =>
    Alert.alert(
      t('cancelTitle'),
      paid
        ? `${t('cancelWarnPaid')}\n\n${t('refundYouGet')}: ${money(Math.max(0, b.amount - fee))} ${t('etb')}\n${t('providerCharge')}: ${money(fee)} ${t('etb')} (${t('notRefundable')})\n\n${t('cannotUndo')}`
        : `${t('cancelWarnUnpaid')}\n\n${t('cannotUndo')}`,
      [
        { text: t('keepBooking'), style: 'cancel' },
        { text: t('yesCancel'), style: 'destructive', onPress: cancel },
      ]
    );

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 50 }]} keyboardShouldPersistTaps="handled" refreshControl={pullControl(pull)}>
      <Banner>{offlineText(t, res)}</Banner>
      <Err>{err}</Err>
      <Ok>{msg}</Ok>

      {/* Digital Wallet Pass - Perforated Header Style matching web wallet pass */}
      <View
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#e2e8f0',
          overflow: 'hidden',
          marginBottom: 16,
          shadowColor: '#013859',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        {/* Pass Academic Top Header - AAU Deep Navy Blue (#013859) */}
        <View
          style={{
            backgroundColor: '#013859',
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Image source={require('../../assets/aau-logo.png')} style={{ width: 36, height: 36, resizeMode: 'contain' }} />
            <View>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                AAU · CNCS 4 KILO
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#ffffff' }}>
                {am ? 'የተፈጥሮ ታሪክ ሙዚየም' : 'Natural History Museum'}
              </Text>
            </View>
          </View>
          <Status value={b.status} t={t} />
        </View>

        {/* Digital QR Section */}
        {rcpt?.data?.qr?.token ? (
          <View style={{ padding: 20, alignItems: 'center', backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
              {am ? 'በመግቢያው በር ላይ ይህንን QR ያሳዩ' : 'Present this pass at Arat Kilo Gate'}
            </Text>
            <Qr value={rcpt.data.qr.token} size={210} />
            <Text style={{ fontSize: 20, fontWeight: '900', color: C.ink, letterSpacing: 2, marginTop: 12 }}>
              {b.ref}
            </Text>
            <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
              {am ? 'ይፋዊ ዲጂታል ትኬት' : 'Official Verified Digital Pass'}
            </Text>
          </View>
        ) : (
          <View style={{ padding: 18, alignItems: 'center', backgroundColor: '#fffbeb' }}>
            <Ionicons name="time" size={32} color="#f2a62b" />
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#92400e', marginTop: 6 }}>
              {b.status === 'AwaitingPayment' ? (am ? 'ክፍያ ይጠበቃል' : 'Awaiting Payment') : (am ? 'ትኬት በመዘጋጀት ላይ' : 'Pass Processing')}
            </Text>
            <Text style={{ fontSize: 12, color: '#b45309', textAlign: 'center', marginTop: 2 }}>
              {b.status === 'AwaitingPayment' ? (am ? 'ትኬቱ እንዲረጋገጥ ክፍያውን በChapa ይፈጽሙ' : 'Complete Chapa payment to generate active gate QR') : ''}
            </Text>
          </View>
        )}

        {/* Ticket Details & Attendance Progress */}
        <View style={{ padding: 16 }}>
          {/* Progress Bar if Visited */}
          {b.status === 'Visited' && (
            <View style={{ backgroundColor: '#e0f2fe', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#7dd3fc', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#013859' }}>
                  {am ? 'የጉብኝት ማረጋገጫ' : 'Attendance Progress'}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#015484' }}>
                  {b.attendedQuantity} / {b.bookedQuantity} ({attendanceProgress}%)
                </Text>
              </View>
              <View style={{ height: 6, backgroundColor: '#cbd5e1', borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${attendanceProgress}%`, backgroundColor: '#015484' }} />
              </View>
            </View>
          )}

          {/* Tour Mode Pill */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 8,
                backgroundColor: b.isGuided ? '#fef3c7' : '#e0f2fe',
                borderWidth: 1,
                borderColor: b.isGuided ? '#fde68a' : '#bae6fd',
              }}
            >
              <Ionicons name={b.isGuided ? 'sparkles' : 'walk'} size={14} color={b.isGuided ? '#b45309' : '#015484'} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: b.isGuided ? '#b45309' : '#015484' }}>
                {b.isGuided
                  ? (am ? `የተመራ ጉብኝት (${b.timeSlot || '09:00'})` : `Guided Tour (${b.timeSlot || '09:00'})`)
                  : (am ? 'ራሱን የቻለ ጉብኝት (Self-Guided)' : 'Self-Guided Admission')}
              </Text>
            </View>
          </View>

          <View style={{ gap: 6, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: C.muted }}>{t('date')}:</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink }}>{formatLong(b.visitDate, lang)}</Text>
            </View>
            {b.organization ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: C.muted }}>{t('organization')}:</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink }}>{b.organization}</Text>
              </View>
            ) : null}
            {b.tin ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: C.muted }}>TIN:</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink }}>{b.tin}</Text>
              </View>
            ) : null}
          </View>

          {/* Ticket lines */}
          <View style={{ borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10, marginBottom: 10 }}>
            {b.lines.map((l, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text style={{ fontSize: 13, color: C.ink }}>
                  {pick(l.name)} × {l.quantity}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink }}>
                  {money(l.quantity * l.unitPrice)} ETB
                </Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1.5, borderTopColor: '#e2e8f0' }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: C.ink }}>{t('total')}:</Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: C.teal }}>{money(b.amount)} ETB</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      {mine && b.status === 'AwaitingPayment' && (
        <Btn
          title={`${t('pay')} · ${money(b.amount)} ETB`}
          onPress={pay}
          disabled={res.offline}
          icon={<Ionicons name="card-outline" size={18} color="#ffffff" />}
        />
      )}

      {mine && rcpt?.data && (
        <View style={{ marginTop: 10 }}>
          <Btn
            kind="ghost"
            title={showReceipt ? t('close') : (am ? 'ይፋዊ ደረሰኝ ይመልከቱ' : 'View Official FDRE Receipt')}
            onPress={() => setShowReceipt(!showReceipt)}
            icon={<Ionicons name="document-text-outline" size={16} color={C.teal} />}
          />
        </View>
      )}

      {mine && shortfall > 0 && !b.shortfallRefunded && (
        <View style={{ marginTop: 12 }}>
          <Text style={[s.muted, { marginBottom: 6 }]}>{t('refundHelp')}</Text>
          <Btn
            title={`${t('refundRequest')} · ${money(shortfall)} ETB`}
            onPress={refund}
            disabled={res.offline}
          />
        </View>
      )}

      {mine && b.status === 'Pending' && b.rescheduleCount < 1 && !res.offline && (
        <View style={{ marginTop: 16 }}>
          <Text style={[s.muted, { marginBottom: 6 }]}>{t('rescheduleOnce')}</Text>
          <Btn kind="ghost" title={showResched ? t('close') : t('reschedule')} onPress={openResched} />
          {showResched && avail && (
            <View style={{ marginTop: 12 }}>
              <Text style={s.label}>{t('newDate')}</Text>
              <CalendarPicker
                value={newDate}
                onChange={setNewDate}
                min={avail.today}
                max={avail.maxDate}
                closed={avail.closedDates}
                blocked={[b.visitDate]}
                today={avail.today}
              />
              <Btn
                title={newDate ? `${t('reschedule')} → ${formatLong(newDate, lang)}` : t('pickDate')}
                onPress={resched}
                disabled={!newDate}
              />
            </View>
          )}
        </View>
      )}

      {showReceipt && rcpt?.data && (
        <View style={{ marginTop: 16 }}>
          <Receipt doc={rcpt.data} />
        </View>
      )}

      {mine && ['PendingApproval', 'AwaitingPayment', 'Pending'].includes(b.status) && (
        <View style={{ marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderColor: '#e2e8f0' }}>
          <Text style={s.label}>{t('needToCancel')}</Text>
          <Text style={[s.muted, { marginBottom: 10 }]}>{t('cancelHelp')}</Text>
          <Btn kind="dangerGhost" title={t('cancel')} onPress={confirmCancel} disabled={res.offline} />
        </View>
      )}
    </ScrollView>
  );
}
