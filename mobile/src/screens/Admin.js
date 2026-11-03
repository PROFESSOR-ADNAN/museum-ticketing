import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api, isNetworkError } from '../api';
import { useApp } from '../context';
import { Btn, C, Err, Field, Loading, Ok, PasswordField, pullControl, s, Status, useRefresh, money } from '../ui';

/**
 * Admin Screen for Mobile
 * Matches web/src/pages/Admin.jsx:
 * 1. Staff Accounts (List, Activate/Deactivate, Create new cashier/manager/admin accounts)
 * 2. Categories (List, Edit, Activate/Retire, Add category)
 * 3. Refunds (Needs attention / All, Retry, Mark as paid)
 * 4. Audit & Jobs (Run No-Show job, View audit logs)
 */

function StaffSection() {
  const { t } = useApp();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name: '', email: '', phone: '+2519', password: '', role: 'cashier' });

  const load = useCallback(async () => {
    setErr('');
    try {
      const res = await api('/admin/staff');
      setData(res);
    } catch (e) {
      setErr(isNetworkError(e) ? t('needsInternet') : e.message);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const pull = useRefresh(load);

  const toggle = (u) => async () => {
    setErr('');
    setOk('');
    try {
      await api(`/admin/staff/${u.id}`, { method: 'PATCH', body: { active: !u.active } });
      await load();
    } catch (e) {
      setErr(isNetworkError(e) ? t('needsInternet') : e.message);
    }
  };

  const create = async () => {
    if (!f.name.trim() || !f.email.trim() || !f.phone.trim() || !f.password) {
      setErr('Please fill in all fields.');
      return;
    }
    if (f.password.length < 8) {
      setErr('Password must be at least 8 characters.');
      return;
    }
    setErr('');
    setOk('');
    setBusy(true);
    try {
      await api('/admin/staff', { method: 'POST', body: f });
      setOk(t('staffCreated') || 'Staff account created successfully!');
      setF({ name: '', email: '', phone: '+2519', password: '', role: 'cashier' });
      await load();
    } catch (e) {
      setErr(isNetworkError(e) ? t('needsInternet') : e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled" refreshControl={pullControl(pull)}>
      <Err>{err}</Err>
      <Ok>{ok}</Ok>

      {/* Create New Account Form */}
      <View style={[s.card, { borderColor: C.teal, borderWidth: 1.5 }]}>
        <Text style={[s.h2, { color: C.teal }]}>+ {t('create')} {t('staff')}</Text>
        <Text style={[s.muted, { marginBottom: 12 }]}>Create Admin, Manager, or Cashier staff accounts</Text>

        <Field label={t('name')} value={f.name} onChangeText={(v) => setF({ ...f, name: v })} placeholder="Full Name" />
        <Field label={t('email')} value={f.email} onChangeText={(v) => setF({ ...f, email: v.toLowerCase() })} keyboardType="email-address" placeholder="staff@museum.test" />
        <Field label={t('phone')} value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} keyboardType="phone-pad" placeholder="+2519..." />
        <PasswordField label={t('password')} value={f.password} onChangeText={(v) => setF({ ...f, password: v })} placeholder="Min 8 characters" />

        {/* Role Picker Buttons */}
        <Text style={s.label}>{t('role')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {['cashier', 'manager', 'admin'].map((roleKey) => {
            const selected = f.role === roleKey;
            return (
              <Pressable
                key={roleKey}
                onPress={() => setF({ ...f, role: roleKey })}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? C.teal : C.line,
                  backgroundColor: selected ? '#e6f3f0' : '#fff',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontWeight: '700', fontSize: 14, color: selected ? C.teal : C.soft }}>
                  {t(roleKey) || roleKey}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Btn title={busy ? t('loading') : `${t('create')} ${t(f.role) || f.role}`} onPress={create} disabled={busy} />
      </View>

      {/* Existing Staff List */}
      <Text style={[s.h2, { marginTop: 8, marginBottom: 10 }]}>{t('staff')} ({data?.staff?.length || 0})</Text>
      {!data && <Loading />}
      {data?.staff?.map((u) => (
        <View key={u.id} style={[s.card, { opacity: u.active ? 1 : 0.6 }]}>
          <View style={[s.row, { marginBottom: 4 }]}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: C.ink }}>{u.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{
                backgroundColor: u.role === 'admin' ? '#f3e8ff' : u.role === 'manager' ? '#e0f2fe' : '#ecfdf5',
                color: u.role === 'admin' ? '#7e22ce' : u.role === 'manager' ? '#0369a1' : '#047857',
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 6,
                fontWeight: '700',
                fontSize: 12,
                textTransform: 'uppercase',
              }}>
                {u.role}
              </Text>
              <Text style={{ fontSize: 12, color: u.active ? '#15803d' : '#b91c1c', fontWeight: '600' }}>
                {u.active ? `● ${t('active')}` : `○ ${t('deactivate')}`}
              </Text>
            </View>
          </View>
          <Text style={s.muted}>✉ {u.email}</Text>
          <Text style={[s.muted, { marginBottom: 10 }]}>📞 {u.phone}</Text>
          <Btn
            kind={u.active ? 'dangerGhost' : 'ghost'}
            title={u.active ? t('deactivate') : t('activate')}
            onPress={toggle(u)}
          />
        </View>
      ))}
    </ScrollView>
  );
}

function CategoriesSection() {
  const { t, pick } = useApp();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [nf, setNf] = useState({ key: '', en: '', am: '', price: '' });
  const [edit, setEdit] = useState({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setErr('');
    try {
      const res = await api('/admin/categories');
      setData(res);
    } catch (e) {
      setErr(isNetworkError(e) ? t('needsInternet') : e.message);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const pull = useRefresh(load);

  const add = async () => {
    if (!nf.key.trim() || !nf.en.trim() || !nf.am.trim() || !nf.price) {
      setErr('Please fill in all category fields.');
      return;
    }
    setErr('');
    setOk('');
    setBusy(true);
    try {
      await api('/admin/categories', {
        method: 'POST',
        body: { key: nf.key.trim(), name: { en: nf.en.trim(), am: nf.am.trim() }, price: Number(nf.price) },
      });
      setOk(t('categoryCreated') || 'Category created!');
      setNf({ key: '', en: '', am: '', price: '' });
      await load();
    } catch (e) {
      setErr(isNetworkError(e) ? t('needsInternet') : e.message);
    } finally {
      setBusy(false);
    }
  };

  const save = (c) => async () => {
    const e = edit[c.id] || {};
    setErr('');
    setOk('');
    try {
      await api(`/admin/categories/${c.id}`, {
        method: 'PATCH',
        body: {
          price: e.price !== undefined ? Number(e.price) : c.price,
          name: { en: e.en ?? c.name.en, am: e.am ?? c.name.am },
        },
      });
      setEdit({ ...edit, [c.id]: undefined });
      setOk(t('save'));
      await load();
    } catch (x) {
      setErr(isNetworkError(x) ? t('needsInternet') : x.message);
    }
  };

  const toggle = (c) => async () => {
    setErr('');
    try {
      await api(`/admin/categories/${c.id}`, { method: 'PATCH', body: { active: !c.active } });
      await load();
    } catch (x) {
      setErr(isNetworkError(x) ? t('needsInternet') : x.message);
    }
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled" refreshControl={pullControl(pull)}>
      <Err>{err}</Err>
      <Ok>{ok}</Ok>

      {/* Add New Category Form */}
      <View style={[s.card, { borderColor: C.teal, borderWidth: 1.5 }]}>
        <Text style={[s.h2, { color: C.teal }]}>+ {t('add')} {t('categories')}</Text>
        <Field label="Key (e.g. senior, family)" value={nf.key} onChangeText={(v) => setNf({ ...nf, key: v.toLowerCase() })} placeholder="key_identifier" />
        <Field label={t('nameEn')} value={nf.en} onChangeText={(v) => setNf({ ...nf, en: v })} placeholder="English Category Name" />
        <Field label={t('nameAm')} value={nf.am} onChangeText={(v) => setNf({ ...nf, am: v })} placeholder="የምድብ ስም በአማርኛ" />
        <Field label={`${t('price')} (${t('etb')})`} value={nf.price} onChangeText={(v) => setNf({ ...nf, price: v })} keyboardType="numeric" placeholder="100" />
        <Btn title={busy ? t('loading') : `${t('add')} ${t('categories')}`} onPress={add} disabled={busy} />
      </View>

      {/* Existing Categories List */}
      <Text style={[s.h2, { marginTop: 8, marginBottom: 10 }]}>{t('categories')} ({data?.categories?.length || 0})</Text>
      {!data && <Loading />}
      {data?.categories?.map((c) => {
        const e = edit[c.id] || {};
        const isEditing = edit[c.id] !== undefined;
        return (
          <View key={c.id} style={[s.card, { opacity: c.active ? 1 : 0.6 }]}>
            <View style={[s.row, { marginBottom: 4 }]}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: C.ink }}>{c.name.en} · {c.name.am}</Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: C.teal }}>{c.price} ETB</Text>
            </View>
            <Text style={[s.muted, { marginBottom: 8 }]}>Key: {c.key} · {c.active ? `● ${t('active')}` : `○ ${t('retire')}`}</Text>

            {isEditing ? (
              <View style={{ marginTop: 8 }}>
                <Field label={t('nameEn')} value={e.en ?? c.name.en} onChangeText={(v) => setEdit({ ...edit, [c.id]: { ...e, en: v } })} />
                <Field label={t('nameAm')} value={e.am ?? c.name.am} onChangeText={(v) => setEdit({ ...edit, [c.id]: { ...e, am: v } })} />
                <Field label={t('price')} value={String(e.price ?? c.price)} onChangeText={(v) => setEdit({ ...edit, [c.id]: { ...e, price: v } })} keyboardType="numeric" />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}><Btn title={t('save')} onPress={save(c)} /></View>
                  <View style={{ flex: 1 }}><Btn kind="ghost" title={t('cancel')} onPress={() => setEdit({ ...edit, [c.id]: undefined })} /></View>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <View style={{ flex: 1 }}><Btn kind="ghost" title={t('save')} onPress={() => setEdit({ ...edit, [c.id]: { en: c.name.en, am: c.name.am, price: String(c.price) } })} /></View>
                <View style={{ flex: 1 }}><Btn kind={c.active ? 'dangerGhost' : 'ghost'} title={c.active ? t('retire') : t('activate')} onPress={toggle(c)} /></View>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

function RefundsSection() {
  const { t } = useApp();
  const [all, setAll] = useState(false);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [refMap, setRefMap] = useState({});

  const load = useCallback(async () => {
    setErr('');
    try {
      const res = await api(`/admin/refunds?filter=${all ? 'all' : 'attention'}`);
      setData(res);
    } catch (e) {
      setErr(isNetworkError(e) ? t('needsInternet') : e.message);
    }
  }, [all, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const pull = useRefresh(load);

  const retryRefund = (id) => async () => {
    setErr('');
    setOk('');
    try {
      await api(`/admin/refunds/${id}/retry`, { method: 'POST' });
      setOk('Retry initiated successfully.');
      await load();
    } catch (e) {
      setErr(isNetworkError(e) ? t('needsInternet') : e.message);
    }
  };

  const resolveRefund = (id) => async () => {
    const ref = refMap[id] || '';
    if (ref.length < 3) {
      setErr('Please enter the manual refund reference.');
      return;
    }
    setErr('');
    setOk('');
    try {
      await api(`/admin/refunds/${id}/resolve`, { method: 'POST', body: { reference: ref } });
      setOk('Refund marked as paid.');
      await load();
    } catch (e) {
      setErr(isNetworkError(e) ? t('needsInternet') : e.message);
    }
  };

  const refunds = data?.refunds || [];

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled" refreshControl={pullControl(pull)}>
      <Err>{err}</Err>
      <Ok>{ok}</Ok>
      <Text style={[s.muted, { marginBottom: 12 }]}>{t('refundHelpAdmin')}</Text>

      {/* Filter Tabs */}
      <View style={{ flexDirection: 'row', backgroundColor: '#e0ebe7', borderRadius: 8, padding: 4, marginBottom: 14 }}>
        <Pressable
          onPress={() => setAll(false)}
          style={{ flex: 1, paddingVertical: 8, borderRadius: 6, backgroundColor: !all ? '#fff' : 'transparent', alignItems: 'center' }}
        >
          <Text style={{ fontWeight: '700', fontSize: 13, color: !all ? C.teal : C.soft }}>{t('needsAttention')}</Text>
        </Pressable>
        <Pressable
          onPress={() => setAll(true)}
          style={{ flex: 1, paddingVertical: 8, borderRadius: 6, backgroundColor: all ? '#fff' : 'transparent', alignItems: 'center' }}
        >
          <Text style={{ fontWeight: '700', fontSize: 13, color: all ? C.teal : C.soft }}>{t('allRefunds')}</Text>
        </Pressable>
      </View>

      {!data && <Loading />}
      {data && !refunds.length && (
        <View style={[s.card, { alignItems: 'center', paddingVertical: 32 }]}>
          <Text style={s.muted}>{t('none')}</Text>
        </View>
      )}

      {refunds.map((r) => (
        <View key={r.id} style={s.card}>
          <View style={[s.row, { marginBottom: 4 }]}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: C.ink }}>{r.bookingRef}</Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: C.teal }}>{money(r.netToVisitor)} ETB</Text>
          </View>
          <Text style={s.muted}>{r.visitor} · {r.phone} · {r.reason}</Text>
          <Text style={[s.muted, { marginBottom: 6 }]}>📅 {r.createdAt?.slice(0, 10)} {r.providerRefundRef ? `· Ref: ${r.providerRefundRef}` : ''}</Text>

          {r.lastError && (
            <View style={{ backgroundColor: '#fbeae6', padding: 8, borderRadius: 6, marginVertical: 6 }}>
              <Text style={{ color: '#7d2616', fontSize: 13 }}>{r.lastError}</Text>
            </View>
          )}

          {r.status !== 'done' && (
            <View style={{ marginTop: 10 }}>
              <Btn kind="ghost" title={t('retry')} onPress={retryRefund(r.id)} />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TextInput
                  style={[s.input, { flex: 1, marginBottom: 0 }]}
                  placeholder={t('refundRef')}
                  placeholderTextColor="#8aa09a"
                  value={refMap[r.id] || ''}
                  onChangeText={(v) => setRefMap({ ...refMap, [r.id]: v })}
                />
                <Btn
                  title={t('markPaid')}
                  onPress={resolveRefund(r.id)}
                  disabled={(refMap[r.id] || '').length < 3}
                />
              </View>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

function AuditSection() {
  const { t } = useApp();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [jobResult, setJobResult] = useState('');
  const [busyJob, setBusyJob] = useState(false);

  const load = useCallback(async () => {
    setErr('');
    try {
      const res = await api('/admin/audit');
      setData(res);
    } catch (e) {
      setErr(isNetworkError(e) ? t('needsInternet') : e.message);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const pull = useRefresh(load);

  const runNoShow = async () => {
    setErr('');
    setJobResult('');
    setBusyJob(true);
    try {
      const res = await api('/admin/jobs/no-show', { method: 'POST' });
      setJobResult(JSON.stringify(res.result || res));
      await load();
    } catch (e) {
      setErr(isNetworkError(e) ? t('needsInternet') : e.message);
    } finally {
      setBusyJob(false);
    }
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 40 }]} refreshControl={pullControl(pull)}>
      <Err>{err}</Err>

      {/* Cron Job Card */}
      <View style={[s.card, { borderColor: C.teal }]}>
        <Text style={s.h2}>⚙ {t('runJob')}</Text>
        <Text style={[s.muted, { marginBottom: 10 }]}>Manually trigger the scheduled no-show processor</Text>
        <Btn title={busyJob ? t('loading') : t('runJob')} onPress={runNoShow} disabled={busyJob} />
        {jobResult ? (
          <View style={{ backgroundColor: '#e6f3ea', padding: 10, borderRadius: 6, marginTop: 10 }}>
            <Text style={{ color: '#1f5a30', fontWeight: '700', fontSize: 13 }}>Result: {jobResult}</Text>
          </View>
        ) : null}
      </View>

      {/* Audit Logs List */}
      <Text style={[s.h2, { marginTop: 8, marginBottom: 10 }]}>{t('audit')} ({data?.logs?.length || 0})</Text>
      {!data && <Loading />}
      {data?.logs?.map((l) => (
        <View key={l.id} style={s.card}>
          <View style={[s.row, { marginBottom: 4 }]}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink }}>{l.action}</Text>
            {l.amount != null && <Text style={{ fontSize: 15, fontWeight: '700', color: C.teal }}>{money(l.amount)} ETB</Text>}
          </View>
          <Text style={s.muted}>👤 {l.actor?.name || 'system'} · 🕒 {l.at?.replace('T', ' ').slice(0, 19)}</Text>
          {l.bookingRefs && l.bookingRefs.length > 0 && (
            <Text style={[s.text, { fontSize: 13, marginTop: 4 }]}>Refs: {l.bookingRefs.join(', ')}</Text>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

export default function AdminScreen() {
  const { t } = useApp();
  const [tab, setTab] = useState('staff');

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      {/* Top Segment Navigation */}
      <View style={{ flexDirection: 'row', backgroundColor: '#e0ebe7', padding: 4, marginHorizontal: 16, marginTop: 12, borderRadius: 8 }}>
        {[
          ['staff', t('staff')],
          ['categories', t('categories')],
          ['refunds', t('refundsTab')],
          ['audit', t('audit')],
        ].map(([key, label]) => {
          const active = tab === key;
          return (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 6,
                backgroundColor: active ? '#fff' : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontWeight: '700', fontSize: 12, color: active ? C.teal : C.soft }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 'staff' && <StaffSection />}
      {tab === 'categories' && <CategoriesSection />}
      {tab === 'refunds' && <RefundsSection />}
      {tab === 'audit' && <AuditSection />}
    </View>
  );
}
