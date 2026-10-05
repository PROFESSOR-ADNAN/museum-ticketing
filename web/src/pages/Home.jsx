import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useI18n } from '../i18n.jsx';
import { useLoad, money } from '../components/ui.jsx';

export default function Home() {
  const { t, pick } = useI18n();
  const { data } = useLoad(() => api('/categories'));
  return (
    <>
      <section className="hero">
        <div>
          <h1>{t('tagline')}</h1>
          <p className="muted" style={{ maxWidth: 480 }}>{t('priceNote')}</p>
          <div className="row" style={{ marginTop: 22 }}>
            <Link className="btn" to="/book">{t('book')}</Link>
            <Link className="btn ghost" to="/group">{t('group')}</Link>
          </div>
        </div>
        <div className="stub" aria-label={t('prices')}>
          <h3>{t('prices')}</h3>
          {(data?.categories || []).map((c) => (
            <div className="price" key={c.id}>
              <span>{pick(c.name)}{!c.onlineBookable && <span className="muted small"> · {t('countersOnly')}</span>}</span>
              <b>{c.price === 0 ? '—' : `${money(c.price)} ${t('etb')}`}</b>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2>{t('howTitle')}</h2>
        <ol className="grid two" style={{ listStyle: 'decimal inside', padding: 0 }}>
          <li className="card">{t('how1')}</li><li className="card">{t('how2')}</li><li className="card">{t('how3')}</li>
        </ol>
      </section>
    </>
  );
}
