import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Button, Field, Logo, BackButton, Title, Subtitle, Card } from '../components/UI';
import { colors } from '../theme';
import { useApp } from '../context';

const Terms = () => (
  <Text style={{ color: colors.faint, fontSize: 11, textAlign: 'center', marginTop: 12 }}>
    By continuing, you agree to our Terms of Service and Privacy Policy
  </Text>
);

const validPhone = (p) => /^\d{10}$/.test(p);

export function WelcomeScreen() {
  const { go, loginUser } = useApp();
  const [phone, setPhone] = useState('');

  const next = () => {
    if (!validPhone(phone)) return Alert.alert('Check your number', 'Enter a valid 10-digit mobile number.');
    go('Otp', { phone, name: '' });
  };

  return (
    <Screen
      footer={
        <View>
          <Text style={{ color: colors.muted, textAlign: 'center', fontSize: 13 }}>
            Don't have an account?{' '}
            <Text style={{ color: colors.pink }} onPress={() => go('CreateAccount')}>
              Create account
            </Text>
          </Text>
          <Terms />
        </View>
      }
    >
      <Card style={{ alignItems: 'center', paddingVertical: 34, marginTop: 20, marginBottom: 30 }}>
        <Logo size={64} />
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700', marginTop: 14 }}>Fixora</Text>
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>Fix it right, step by step</Text>
      </Card>

      <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: 14 }}>Welcome</Text>
      <Field
        prefix="+91"
        placeholder="Phone number"
        keyboardType="number-pad"
        maxLength={10}
        value={phone}
        onChangeText={(t) => setPhone(t.replace(/\D/g, ''))}
        style={{ marginBottom: 14 }}
      />
      <Button title="Continue" onPress={next} />

      <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 16 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        <Text style={{ color: colors.muted, marginHorizontal: 10, fontSize: 11 }}>or</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      </View>

      <Button
        title="Continue with Google"
        variant="white"
        onPress={() =>
          // Demo sign-in. Replace with real Google auth (see README, "Next steps").
          loginUser({ name: 'Google user', phone: '', email: '' })
        }
        style={{ marginBottom: 12 }}
      />
      <Button title="Continue with email" variant="outline" icon="mail-outline" onPress={() => go('CreateAccount')} />
    </Screen>
  );
}

export function CreateAccountScreen() {
  const { go, back } = useApp();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const next = () => {
    if (!name.trim()) return Alert.alert('Name needed', 'Please enter your full name.');
    if (!validPhone(phone)) return Alert.alert('Check your number', 'Enter a valid 10-digit mobile number.');
    go('Otp', { phone, name: name.trim(), email: email.trim() });
  };

  return (
    <Screen
      footer={
        <View>
          <Button title="Continue" onPress={next} />
          <Text style={{ color: colors.muted, textAlign: 'center', fontSize: 13, marginTop: 16 }}>
            Already have an account?{' '}
            <Text style={{ color: colors.pink }} onPress={back}>
              Log in
            </Text>
          </Text>
          <Terms />
        </View>
      }
    >
      <BackButton onPress={back} />
      <Title>Create account</Title>
      <View style={{ height: 14 }} />
      <Field label="Full name" placeholder="Your name" value={name} onChangeText={setName} />
      <Field
        label="Phone number"
        prefix="+91"
        placeholder="Mobile number"
        keyboardType="number-pad"
        maxLength={10}
        value={phone}
        onChangeText={(t) => setPhone(t.replace(/\D/g, ''))}
      />
      <Field
        label="Email (optional)"
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
    </Screen>
  );
}

export function OtpScreen({ params }) {
  const { back, loginUser } = useApp();
  const [code, setCode] = useState('');
  const [secs, setSecs] = useState(24);
  const inputRef = useRef(null);

  useEffect(() => {
    if (secs <= 0) return undefined;
    const t = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs]);

  const masked = `+91 ${params.phone.slice(0, 2)}XXX XXXXX`;
  const mm = `00:${String(secs).padStart(2, '0')}`;

  const verify = () => {
    if (code.length !== 6) return Alert.alert('Enter the code', 'Type the 6-digit code.');
    Keyboard.dismiss();
    // DEMO: any 6-digit code is accepted. Plug in a real SMS provider (e.g. Firebase Auth) here.
    loginUser({ name: params.name || 'Fixora user', phone: params.phone, email: params.email || '' });
  };

  return (
    <Screen
      footer={
        <View>
          <Button title="Verify and continue" onPress={verify} style={{ marginBottom: 12 }} />
          <Button title="Change number" variant="outline" onPress={back} />
        </View>
      }
    >
      <BackButton onPress={back} />
      <Title>Enter the code</Title>
      <Subtitle>We sent a 6-digit code to {masked}.</Subtitle>

      <TouchableOpacity activeOpacity={1} onPress={() => inputRef.current && inputRef.current.focus()}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View
              key={i}
              style={{
                width: 46,
                height: 52,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: i === code.length ? colors.primary : colors.border,
                backgroundColor: colors.card,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>{code[i] || ''}</Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
      <TextInput
        ref={inputRef}
        value={code}
        onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
        style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }}
      />

      <View style={{ marginTop: 16 }}>
        {secs > 0 ? (
          <Text style={{ color: colors.orange, fontSize: 12 }}>Resend code in {mm}</Text>
        ) : (
          <Text style={{ color: colors.pink, fontSize: 12 }} onPress={() => setSecs(24)}>
            Resend code
          </Text>
        )}
      </View>
    </Screen>
  );
}
