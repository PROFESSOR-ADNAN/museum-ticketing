import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context';
import { C, s } from '../ui';
import { MONTHS, WEEKDAYS, addMonths, addisToday, formatLong, monthAllowed, monthGrid, parseISO } from '../dateutil';

/**
 * Month calendar: tap a day instead of typing it. Days before `min`, after `max`, closed by the museum (`closed`)
 * or in `blocked` cannot be selected. All dates are 'YYYY-MM-DD'.
 */
export default function CalendarPicker({ value, onChange, min, max, closed = [], blocked = [], today }) {
  const { t, lang } = useApp();
  const now = today || addisToday();
  const lo = min || now;                                            // never offer the past, even before the server answered
  const start = parseISO(value) || parseISO(lo) || parseISO(now);
  const [view, setView] = useState({ y: start.y, m: start.m });
  const weeks = useMemo(() => monthGrid(view.y, view.m, { min: lo, max, closed, blocked, today: now, selected: value }),
    [view.y, view.m, lo, max, closed, blocked, now, value]);
  const prev = addMonths(view.y, view.m, -1), next = addMonths(view.y, view.m, 1);
  const canPrev = monthAllowed(prev.y, prev.m, { min: lo, max }), canNext = monthAllowed(next.y, next.m, { min: lo, max });
  const arrow = (to, ok, name, label) => (
    <Pressable onPress={() => ok && setView(to)} disabled={!ok} accessibilityRole="button" accessibilityLabel={label} hitSlop={8}
      style={{ padding: 8, opacity: ok ? 1 : 0.25 }}><Ionicons name={name} size={24} color={C.ink} /></Pressable>
  );
  return (
    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 8, marginBottom: 10 }}>
      <View style={[s.row, { marginBottom: 6 }]}>
        {arrow(prev, canPrev, 'chevron-back', 'previous month')}
        <Text style={[s.h2, { marginBottom: 0 }]}>{MONTHS[lang][view.m]} {view.y}</Text>
        {arrow(next, canNext, 'chevron-forward', 'next month')}
      </View>
      <View style={{ flexDirection: 'row' }}>
        {WEEKDAYS[lang].map((w) => <Text key={w} style={{ flex: 1, textAlign: 'center', color: C.soft, fontSize: 12, fontWeight: '600', paddingBottom: 4 }}>{w}</Text>)}
      </View>
      {weeks.map((week, i) => (
        <View key={i} style={{ flexDirection: 'row' }}>
          {week.map((c, j) => (c ? (
            <Pressable key={c.iso} disabled={c.disabled} onPress={() => onChange(c.iso)} accessibilityRole="button"
              accessibilityLabel={formatLong(c.iso, lang)} accessibilityState={{ disabled: c.disabled, selected: c.selected }}
              style={{ flex: 1, aspectRatio: 1, margin: 2, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
                backgroundColor: c.selected ? C.teal : c.closed ? '#fbeae6' : 'transparent',
                borderWidth: c.isToday && !c.selected ? 1.5 : 0, borderColor: C.teal }}>
              <Text style={{ fontSize: 15, fontWeight: c.selected ? '800' : '500', color: c.selected ? '#fff' : c.disabled ? '#b3c2be' : C.ink,
                textDecorationLine: c.closed ? 'line-through' : 'none' }}>{c.day}</Text>
            </Pressable>
          ) : <View key={`blank-${i}-${j}`} style={{ flex: 1, margin: 2 }} />))}
        </View>
      ))}
      {closed.length > 0 && <Text style={[s.muted, { fontSize: 12, marginTop: 4 }]}>{t('closedLegend')}</Text>}
    </View>
  );
}
