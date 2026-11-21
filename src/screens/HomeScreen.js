import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Logo, Card, Badge } from '../components/UI';
import { colors, radius } from '../theme';
import { useApp } from '../context';

function fmtDate(iso) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  return `${d.getDate()} ${d.toLocaleString('en-GB', { month: 'short' })}`;
}

export default function HomeScreen() {
  const { user, history, startNewRepair, resumeRepair, logout } = useApp();

  const profile = () =>
    Alert.alert(user?.name || 'Your profile', user?.phone ? `+91 ${user.phone}` : user?.email || '', [
      { text: 'Log out', style: 'destructive', onPress: logout },
      { text: 'Close', style: 'cancel' },
    ]);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Logo size={26} />
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginLeft: 10 }}>Fixora</Text>
        </View>
        <TouchableOpacity
          onPress={profile}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            borderWidth: 1.5,
            borderColor: colors.pink,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="person-outline" size={20} color={colors.muted} />
        </TouchableOpacity>
      </View>

      <Text style={{ color: colors.text, fontSize: 26, fontWeight: '700', marginBottom: 14 }}>Your repairs</Text>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={startNewRepair}
        style={{
          backgroundColor: colors.primary,
          borderRadius: 20,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 22,
        }}
      >
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.2)',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 14,
          }}
        >
          <Ionicons name="add" size={26} color="#fff" />
        </View>
        <View>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>New problem</Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 }}>Start a fresh guided repair</Text>
        </View>
      </TouchableOpacity>

      <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 10 }}>Recent history</Text>

      {history.length === 0 && (
        <Text style={{ color: colors.faint, fontSize: 13 }}>No repairs yet. Tap "New problem" to begin.</Text>
      )}

      {history.map((h) => {
        const inProgress = h.status === 'progress';
        return (
          <Card key={h.id} onPress={inProgress && h.session ? () => resumeRepair(h) : undefined}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{h.title}</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                  {fmtDate(h.date)} · {inProgress ? `Step ${h.step} of ${h.total}` : 'Verified'}
                </Text>
              </View>
              <Badge text={inProgress ? 'In progress' : 'Fixed'} tone={inProgress ? 'amber' : 'green'} />
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
