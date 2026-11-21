import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

export function Logo({ size = 28 }) {
  const ring = size;
  return (
    <View style={{ width: ring, height: ring, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          width: ring,
          height: ring,
          borderRadius: ring / 2,
          borderWidth: ring * 0.16,
          borderColor: colors.pink,
          borderRightColor: colors.orange,
        }}
      />
      <View
        style={{
          width: ring * 0.5,
          height: ring * 0.5,
          borderRadius: ring * 0.25,
          borderWidth: ring * 0.12,
          borderColor: colors.orange,
          borderLeftColor: colors.pink,
        }}
      />
    </View>
  );
}

export function Screen({ children, footer, scroll = true, padded = true }) {
  const Body = scroll ? ScrollView : View;
  const bodyProps = scroll
    ? { contentContainerStyle: [styles.scrollContent, padded && styles.pad], keyboardShouldPersistTaps: 'handled' }
    : { style: [{ flex: 1 }, padded && styles.pad] };
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Body {...bodyProps}>{children}</Body>
        {footer ? <View style={[styles.footer, padded && styles.pad]}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function BackButton({ onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.back} accessibilityLabel="Back">
      <Ionicons name="arrow-back" size={18} color={colors.text} />
    </TouchableOpacity>
  );
}

// Brand row + 7-segment progress bar + "Phase X of 7"
export function PhaseHeader({ phase, brand = false }) {
  return (
    <View style={{ marginBottom: 14 }}>
      {brand && (
        <View style={styles.brandRow}>
          <Logo size={26} />
          <Text style={styles.brandText}>Fixora</Text>
        </View>
      )}
      <View style={styles.progress}>
        {Array.from({ length: 7 }).map((_, i) => (
          <View
            key={i}
            style={[styles.seg, { backgroundColor: i < phase ? colors.pink : colors.border }]}
          />
        ))}
      </View>
      <Text style={styles.phaseLabel}>Phase {phase} of 7</Text>
    </View>
  );
}

export function Title({ children }) {
  return <Text style={styles.title}>{children}</Text>;
}
export function Subtitle({ children }) {
  return <Text style={styles.subtitle}>{children}</Text>;
}
export function Label({ children }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Button({ title, onPress, variant = 'primary', icon, disabled, loading, style }) {
  const v = variants[variant];
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.btn, v.btn, (disabled || loading) && { opacity: 0.5 }, style]}
    >
      {loading ? (
        <ActivityIndicator color={v.text.color} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {icon ? <Ionicons name={icon} size={16} color={v.text.color} style={{ marginRight: 8 }} /> : null}
          <Text style={[styles.btnText, v.text]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const variants = {
  primary: { btn: { backgroundColor: colors.primary }, text: { color: '#fff' } },
  white: { btn: { backgroundColor: '#fff' }, text: { color: '#111' } },
  outline: { btn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border }, text: { color: '#fff' } },
};

export function Field({ label, style, inputStyle, prefix, multiline, ...props }) {
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {label ? <Label>{label}</Label> : null}
      <View style={{ flexDirection: 'row' }}>
        {prefix ? (
          <View style={[styles.input, styles.prefix]}>
            <Text style={{ color: colors.text }}>{prefix}</Text>
          </View>
        ) : null}
        <TextInput
          placeholderTextColor={colors.faint}
          style={[styles.input, { flex: 1 }, multiline && { height: 110, textAlignVertical: 'top', paddingTop: 12 }, inputStyle]}
          multiline={multiline}
          {...props}
        />
      </View>
    </View>
  );
}

export function Card({ children, style, onPress, selected }) {
  const content = (
    <View style={[styles.card, selected && { borderColor: colors.primary, backgroundColor: colors.primarySoft }, style]}>
      {children}
    </View>
  );
  return onPress ? (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      {content}
    </TouchableOpacity>
  ) : (
    content
  );
}

const badgeColors = {
  amber: { c: colors.amber, bg: colors.amberBg },
  green: { c: colors.green, bg: colors.greenBg },
};
export function Badge({ text, tone = 'green' }) {
  const t = badgeColors[tone];
  return (
    <View style={[styles.badge, { borderColor: t.c, backgroundColor: t.bg }]}>
      <Text style={{ color: t.c, fontSize: 11, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

export function Loading({ text }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.pink} />
      <Text style={{ color: colors.text, marginTop: 14, textAlign: 'center', paddingHorizontal: 30 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingTop: 14, paddingBottom: 24, flexGrow: 1 },
  pad: { paddingHorizontal: 20 },
  footer: { paddingTop: 10, paddingBottom: 14 },
  back: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  brandText: { color: colors.text, fontSize: 18, fontWeight: '600', marginLeft: 10 },
  progress: { flexDirection: 'row', gap: 4 },
  seg: { flex: 1, height: 3, borderRadius: 2 },
  phaseLabel: { color: colors.orange, fontSize: 11, marginTop: 6 },
  title: { color: colors.text, fontSize: 26, fontWeight: '700', marginBottom: 6 },
  subtitle: { color: colors.muted, fontSize: 13, marginBottom: 18, lineHeight: 19 },
  label: { color: colors.muted, fontSize: 12, marginBottom: 6 },
  btn: { height: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 15, fontWeight: '700' },
  input: {
    height: 48,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 14,
  },
  prefix: { width: 64, marginRight: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 0 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 12,
  },
  badge: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
  loading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(19,15,30,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
});
