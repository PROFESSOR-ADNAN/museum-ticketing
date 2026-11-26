import { useI18n } from '../i18n.jsx';

export default function StaffShell({ title, subtitle, roleTitle, children }) {
  const { lang } = useI18n();
  const am = lang === 'am';

  return (
    <div className="staff-portal-wrapper">
      {/* Main Staff Header */}
      <div className="staff-page-header">
        <div className="staff-page-header-inner">
          <div>
            <span className="section-eyebrow">
              {am ? 'የአዲስ አበባ ዩኒቨርሲቲ የተፈጥሮ ሳይንስ ኮሌጅ' : 'Addis Ababa University · CNCS'}
            </span>
            <h1 className="staff-page-title">{title}</h1>
            {subtitle && <p className="staff-page-subtitle">{subtitle}</p>}
          </div>
        </div>
      </div>

      {/* Staff Body Content */}
      <div className="staff-page-body">
        {children}
      </div>
    </div>
  );
}
