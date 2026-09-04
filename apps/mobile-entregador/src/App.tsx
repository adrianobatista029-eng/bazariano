import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { LoginScreen } from "@/screens/LoginScreen";
import { SignupScreen } from "@/screens/SignupScreen";
import { HomeTabs } from "@/navigation/HomeTabs";
import { ActiveDeliveryScreen } from "@/screens/ActiveDeliveryScreen";
import { AppSplash } from "@/components/AppSplash";
import type { RootStackParamList } from "@/navigation/types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  // Só monta a navegação (tela de mapa, consultas ao banco, etc.) depois que
  // o splash termina — antes, os dois rodavam juntos e o carregamento pesado
  // do mapa competia com a animação pelo mesmo processador, deixando a
  // abertura do app travada/pesada. Assim a animação roda sozinha, leve, e
  // o trabalho pesado só começa quando ela já cobriu a tela toda.
  const showContent = !showSplash && ready;

  return (
    <>
      {showContent && (
        <NavigationContainer>
          <Stack.Navigator>
            {session ? (
              <>
                <Stack.Screen name="Main" component={HomeTabs} options={{ headerShown: false }} />
                <Stack.Screen
                  name="ActiveDelivery"
                  component={ActiveDeliveryScreen}
                  options={{ title: "Entrega ativa" }}
                />
              </>
            ) : (
              <>
                <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
                <Stack.Screen
                  name="Signup"
                  component={SignupScreen}
                  options={{ headerShown: false }}
                />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      )}
      {showSplash && <AppSplash onFinish={() => setShowSplash(false)} />}
    </>
  );
}
