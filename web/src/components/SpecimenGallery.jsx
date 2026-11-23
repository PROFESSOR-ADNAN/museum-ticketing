import { useState, useEffect, useMemo } from 'react';
import { useI18n } from '../i18n.jsx';
import { ChevronLeft, ChevronRight, X, ZoomIn, Info, Sparkles } from 'lucide-react';

export const specimens = [
  {
    id: 'walia-ibex',
    nameEn: 'Walia Ibex',
    nameAm: 'ዋልያ',
    categoryEn: 'Mammal',
    categoryAm: 'አጥቢ እንስሳ',
    descEn: 'Endemic wild mountain goat living exclusively in the high crags of the Simien Mountains National Park.',
    descAm: 'በስሜን ተራሮች ብሔራዊ ፓርክ ብቻ የሚገኝ ብርቅዬ የኢትዮጵያ የዱር ፍየል ዝርያ።',
    src: '/gallery/walia-ibex.jpg',
    endemic: true,
  },
  {
    id: 'nyala',
    nameEn: 'Mountain Nyala',
    nameAm: 'የደጋ ኒያላ',
    categoryEn: 'Mammal',
    categoryAm: 'አጥቢ እንስሳ',
    descEn: 'Majestic spiral-horned antelope native to the high altitudes and heather of the Bale Mountains.',
    descAm: 'በባሌ ተራሮች ደጋማ ስፍራዎች ብቻ የሚገኝ ግርማ ሞገስ ያለው ብርቅዬ የአጋዘን ዝርያ።',
    src: '/gallery/niyala.jpg',
    endemic: true,
  },
  {
    id: 'hyena',
    nameEn: 'Spotted Hyena',
    nameAm: 'ጅብ',
    categoryEn: 'Mammal',
    categoryAm: 'አጥቢ እንስሳ',
    descEn: 'Powerful carnivore specimen representing Ethiopia’s savanna and highland predator biodiversity.',
    descAm: 'የኢትዮጵያን የደጋና ቆላማ አካባቢዎች የአዳኝ እንስሳት ስነ-ምህዳር የሚወክል የተጠበቀ ናሙና።',
    src: '/gallery/hayna.jpg',
    endemic: false,
  },
  {
    id: 'goats-horn',
    nameEn: "Mountain Goat's Horn",
    nameAm: 'የተራራ ፍየል ቀንድ',
    categoryEn: 'Osteology',
    categoryAm: 'የአጥንት ቅርስ',
    descEn: 'Preserved cranial and horn structure showcasing adaptation to high-altitude montane cliffs.',
    descAm: 'ለከፍተኛ ተራራማ አካባቢ ኑሮ የተስማማውን የራስ ቅልና የቀንድ ቅርጽ የሚያሳይ ሳይንሳዊ ናሙና።',
    src: '/gallery/goats-horn.jpg',
    endemic: false,
  },
  {
    id: 'insects',
    nameEn: 'Endemic Insects & Lepidoptera',
    nameAm: 'ነፍሳት እና ቢራቢሮዎች',
    categoryEn: 'Insects',
    categoryAm: 'ነፍሳት',
    descEn: 'Extensive entomological collection documenting beetles, butterflies, and pollinators of the Horn of Africa.',
    descAm: 'በአፍሪካ ቀንድ የሚገኙ ብርቅዬ ጥንዚዛዎችን፣ ቢራቢሮዎችንና ነፍሳትን የያዘ ሰፊ የስነ-ነፍሳት ማህደር።',
    src: '/gallery/insects.jpg',
    endemic: false,
  },
  {
    id: 'reptiles',
    nameEn: 'Rift Valley Serpents & Reptiles',
    nameAm: 'የስምጥ ሸለቆ እባቦችና ተሳቢዎች',
    categoryEn: 'Reptiles',
    categoryAm: 'ተሳቢ እንስሳት',
    descEn: 'Preserved specimens of venomous and non-venomous reptiles from the Great Rift Valley basin.',
    descAm: 'ከታላቁ የስምጥ ሸለቆ ተፋሰስ የተሰበሰቡ መርዛማና መርዛማ ያልሆኑ የተሳቢ እንስሳት ናሙናዎች።',
    src: '/gallery/reptiles.jpg',
    endemic: false,
  },
  {
    id: 'tortoise-reptiles',
    nameEn: 'Leopard Tortoise & Lizards',
    nameAm: 'የነብር ዔሊ እና እንሽላሊቶች',
    categoryEn: 'Reptiles',
    categoryAm: 'ተሳቢ እንስሳት',
    descEn: 'Ancient chelonian taxidermy display alongside regional monitor lizards and agamas.',
    descAm: 'የዔሊዎችና የተለያዩ የአገር በቀል እንሽላሊቶች የተጠበቀ ማሳያ።',
    src: '/gallery/tortoise-reptailes.jpg',
    endemic: false,
  },
];

export function SpecimenGallery() {
  const { lang } = useI18n();
  const am = lang === 'am';
  const [selected, setSelected] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  const filterTabs = useMemo(() => [
    { id: 'all', label: am ? 'ሁሉም ስብስቦች' : 'All Collections' },
    { id: 'mammal', label: am ? 'አጥቢ እንስሳት' : 'Mammals' },
    { id: 'reptile', label: am ? 'ተሳቢዎችና ዔሊዎች' : 'Reptiles' },
    { id: 'insect', label: am ? 'ነፍሳት' : 'Insects' },
  ], [am]);

  const filteredSpecimens = useMemo(() => {
    if (activeFilter === 'all') return specimens;
    if (activeFilter === 'mammal') {
      return specimens.filter((s) => s.id === 'walia-ibex' || s.id === 'nyala' || s.id === 'hyena' || s.id === 'goats-horn');
    }
    if (activeFilter === 'reptile') {
      return specimens.filter((s) => s.id === 'reptiles' || s.id === 'tortoise-reptiles');
    }
    if (activeFilter === 'insect') {
      return specimens.filter((s) => s.id === 'insects');
    }
    return specimens;
  }, [activeFilter]);

  useEffect(() => {
    if (selected === null) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setSelected(null);
      if (e.key === 'ArrowRight') setSelected((v) => (v === null ? 0 : (v + 1) % filteredSpecimens.length));
      if (e.key === 'ArrowLeft') setSelected((v) => (v === null ? 0 : (v - 1 + filteredSpecimens.length) % filteredSpecimens.length));
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selected, filteredSpecimens.length]);

  const current = selected !== null ? filteredSpecimens[selected] : null;

  return (
    <div className="gallery-section">
      {/* Category filter tabs */}
      <div className="gallery-filters" role="tablist" aria-label={am ? 'የስብስብ ምድቦች' : 'Collection Categories'}>
        {filterTabs.map((tab) => {
          const active = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setActiveFilter(tab.id);
                setSelected(null);
              }}
              className={`gallery-tab-btn ${active ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Gallery Grid */}
      <div className="gallery-grid">
        {filteredSpecimens.map((specimen, index) => {
          return (
            <div
              key={specimen.id}
              onClick={() => setSelected(index)}
              className="gallery-card"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelected(index);
                }
              }}
              aria-label={am ? specimen.nameAm : specimen.nameEn}
            >
              <div className="gallery-thumb-wrap">
                <img
                  src={specimen.src}
                  alt={am ? specimen.nameAm : specimen.nameEn}
                  className="gallery-thumb"
                  loading="lazy"
                />
                <div className="gallery-thumb-overlay">
                  <span className="gallery-zoom-badge">
                    <ZoomIn size={16} />
                    <span>{am ? 'ይመልከቱ' : 'View Specimen'}</span>
                  </span>
                </div>
                {specimen.endemic && (
                  <span className="gallery-endemic-badge">
                    <Sparkles size={12} />
                    <span>{am ? 'ብርቅዬ ዝርያ' : 'Endemic Species'}</span>
                  </span>
                )}
                <span className="gallery-category-pill">
                  {am ? specimen.categoryAm : specimen.categoryEn}
                </span>
              </div>
              <div className="gallery-card-info">
                <h3 className="gallery-card-title">{am ? specimen.nameAm : specimen.nameEn}</h3>
                <p className="gallery-card-desc">{am ? specimen.descAm : specimen.descEn}</p>
                <div className="gallery-card-meta">
                  <span className="gallery-meta-source">{am ? 'ከዩኒቨርሲቲው የምርምር ማህደር' : 'AAU Research Archive'}</span>
                  <span className="gallery-meta-action">{am ? 'ዝርዝር →' : 'Details →'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox Modal */}
      {selected !== null && current && (
        <div
          className="gallery-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}
        >
          <div className="gallery-modal-dialog">
            {/* Modal Header */}
            <div className="gallery-modal-header">
              <div>
                <span className="gallery-modal-category">
                  {am ? current.categoryAm : current.categoryEn}
                </span>
                <h2 className="gallery-modal-title">
                  {am ? current.nameAm : current.nameEn}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label={am ? 'ዝጋ' : 'Close'}
                className="gallery-modal-close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Image Display */}
            <div className="gallery-modal-image-wrap">
              <img
                src={current.src}
                alt={am ? current.nameAm : current.nameEn}
                className="gallery-modal-img"
              />

              {/* Prev / Next buttons */}
              {filteredSpecimens.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setSelected((selected - 1 + filteredSpecimens.length) % filteredSpecimens.length)}
                    aria-label={am ? 'ቀዳሚ' : 'Previous'}
                    className="gallery-nav-btn prev"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected((selected + 1) % filteredSpecimens.length)}
                    aria-label={am ? 'ቀጣይ' : 'Next'}
                    className="gallery-nav-btn next"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="gallery-modal-footer">
              <div className="gallery-modal-note">
                <Info size={16} className="gallery-info-icon" />
                <span>
                  {am
                    ? 'በአዲስ አበባ ዩኒቨርሲቲ የተፈጥሮና ኮምፒውቲንግ ሳይንስ ኮሌጅ የሚገኝ ይፋዊ ናሙና'
                    : 'Official specimen curated by AAU College of Natural & Computational Sciences'}
                </span>
              </div>
              <div className="gallery-modal-controls">
                <span className="gallery-counter">
                  {selected + 1} / {filteredSpecimens.length}
                </span>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="btn small"
                >
                  {am ? 'እሺ' : 'Done'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default SpecimenGallery;
