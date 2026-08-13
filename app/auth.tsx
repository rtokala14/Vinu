import { use$ } from '@legendapp/state/react';
import axios from 'axios';
import React, { useState, useRef } from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
  TextInput,
  ActivityIndicator,
  View,
} from 'react-native';
import Animated, {
  CurvedTransition,
  FadeInLeft,
  FadeInRight,
  FadeOutLeft,
  FadeOutRight,
} from 'react-native-reanimated';

import { useLogin } from '~/api/queries/auth/auth';
import { Container } from '~/components/Container';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Separator } from '~/components/ui/separator';
import { Text } from '~/components/ui/text';
import { Muted } from '~/components/ui/typography';
import { parseServerUrl } from '~/lib/utils';
import { store$ } from '~/stores';

export default function Home() {
  const [loginStep, setLoginStep] = useState(1);

  const [testConnState, setTestConnState] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle'
  );

  const parsedUrl = parseServerUrl(store$.settings.serverUrl.peek());
  const existingUser = use$(store$.user.peek());

  const [loginState, setLoginState] = useState<{
    protocol: 'http' | 'https';
    serverAddress: string;
    serverPort: string;
    username: string;
    password: string;
  }>({
    protocol: parsedUrl.protocol,
    serverAddress: parsedUrl.serverAddress,
    serverPort: parsedUrl.serverPort,
    username: existingUser ? (existingUser.username as string) : '',
    password: '',
  });

  const passwordInputRef = useRef<TextInput>(null);

  const serverUrl = `${loginState.protocol}://${loginState.serverAddress}${loginState.serverPort === '' ? '' : `:${loginState.serverPort}`}`;

  const {
    mutate: login,
    isPending: isLoggingIn,
    isError: loginError,
  } = useLogin({
    mutation: {
      onSuccess: (data) => {
        store$.user.set(data.user);
        store$.userToken.set(data.user?.token!);
        store$.currentLibraryId.set(data.userDefaultLibraryId);
        // console.log('Login successful: ', data.user);
      },
      onError: (error) => {
        console.error('Login Failed: ', error);
      },
    },
  });

  async function testConnection() {
    setTestConnState('loading');
    try {
      const res = await axios.get(serverUrl, { timeout: 3000 }).then((res) => res);
      if (res.status === 200) {
        setTestConnState('success');
        store$.settings.serverUrl.set(serverUrl);
        setLoginStep(2);
        return true;
      } else {
        setTestConnState('error');
        return false;
      }
    } catch (error) {
      setTestConnState('error');
      console.log(error);
      return false;
    }
  }

  function handleLogin() {
    if (loginState.username && loginState.password) {
      login({
        data: {
          username: loginState.username,
          password: loginState.password,
        },
      });
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          contentInset={{ bottom: 10, top: 20 }}
          // scrollIndicatorInsets={{ bottom: 10 }}>
        >
          <Container>
            <Animated.View layout={CurvedTransition}>
              <Card>
                <CardHeader>
                  <CardTitle className=" mb-2">Connect to ABS Server</CardTitle>
                  <CardDescription>
                    {loginStep === 1
                      ? 'Enter your Audiobookshelf Server URL and test the connection.'
                      : 'Enter your username and password to log in'}
                  </CardDescription>
                </CardHeader>

                <Separator className=" -mt-4 mb-4" />

                <CardContent className=" flex w-full">
                  {loginStep === 1 ? (
                    <Animated.View
                      key="step1-content"
                      exiting={FadeOutLeft}
                      entering={FadeInLeft}
                      className="flex w-full gap-4">
                      <Label>Protocol</Label>

                      <View className="-mt-2 flex flex-row items-center justify-stretch gap-4">
                        <Button
                          variant={loginState.protocol === 'http' ? 'secondary' : 'outline'}
                          onPress={() =>
                            setLoginState((prevState) => ({
                              ...prevState,

                              protocol: 'http',
                            }))
                          }
                          className="flex-1">
                          <Text>HTTP</Text>
                        </Button>

                        <Button
                          variant={loginState.protocol === 'https' ? 'secondary' : 'outline'}
                          onPress={() =>
                            setLoginState((prevState) => ({
                              ...prevState,

                              protocol: 'https',
                            }))
                          }
                          className="flex-1">
                          <Text>HTTPS</Text>
                        </Button>
                      </View>

                      <Label nativeID="serverAddress">Server Address</Label>

                      <Input
                        placeholder="audioshelf.homelab.com"
                        value={loginState.serverAddress}
                        className=" -mt-2"
                        keyboardType="url"
                        aria-labelledby="serverAddress"
                        onChangeText={(newAddress) =>
                          setLoginState((prevState) => ({
                            ...prevState,
                            serverAddress: newAddress,
                          }))
                        }
                      />

                      <Label nativeID="serverPort">Port No. (optional)</Label>

                      <Input
                        value={loginState.serverPort}
                        onChangeText={(newPort) =>
                          setLoginState((prevState) => ({ ...prevState, serverPort: newPort }))
                        }
                        inputMode="numeric"
                        keyboardType="number-pad"
                        className="-mt-2"
                        placeholder={loginState.protocol === 'http' ? '80' : '443'}
                      />

                      <Muted className="-mt-3">Default - 80 for HTTP, 443 for HTTPS</Muted>

                      {testConnState === 'error' ? (
                        <Text className=" text-center text-lg text-destructive">
                          There was an error while trying to reach the server. Please recheck and
                          try again.
                        </Text>
                      ) : (
                        <></>
                      )}
                    </Animated.View>
                  ) : (
                    <Animated.View
                      key="step2-content"
                      entering={FadeInRight}
                      exiting={FadeOutRight}
                      className="flex w-full gap-4">
                      <View className=" flex flex-row items-center justify-evenly gap-2">
                        <Text>{serverUrl}</Text>
                        <Button onPress={() => setLoginStep(1)} variant="secondary">
                          <Text>Edit</Text>
                        </Button>
                      </View>
                      <Label>Username</Label>
                      <Input
                        value={loginState.username}
                        className="-mt-2"
                        onChangeText={(newUsername) =>
                          setLoginState((prevState) => ({ ...prevState, username: newUsername }))
                        }
                      />
                      <Label>Password</Label>
                      <Input
                        ref={passwordInputRef}
                        className="-mt-2"
                        textContentType="password"
                        secureTextEntry
                        value={loginState.password}
                        onChangeText={(newPwd) =>
                          setLoginState((prevState) => ({ ...prevState, password: newPwd }))
                        }
                      />
                      {loginError && (
                        <Text className=" text-center text-lg text-destructive">
                          Login failed. Please check your credentials and try again.
                        </Text>
                      )}
                    </Animated.View>
                  )}
                </CardContent>

                <CardFooter>
                  {loginStep === 1 ? (
                    <Animated.View
                      className="w-full"
                      entering={FadeInLeft}
                      exiting={FadeOutLeft}
                      key="step1-button">
                      <Button
                        disabled={loginState.serverAddress === ''}
                        className=" w-full"
                        onPress={() => testConnection()}>
                        <Text>
                          {testConnState === 'idle' || testConnState === 'error' ? (
                            'Test Connection'
                          ) : testConnState === 'loading' ? (
                            <ActivityIndicator />
                          ) : (
                            'Server Verified. Continue.'
                          )}
                        </Text>
                      </Button>
                    </Animated.View>
                  ) : (
                    <Animated.View
                      className="w-full"
                      entering={FadeInRight}
                      exiting={FadeOutRight}
                      key="step2-button">
                      <Button onPress={handleLogin} disabled={isLoggingIn}>
                        <Text>Log In</Text>
                      </Button>
                    </Animated.View>
                  )}
                </CardFooter>
              </Card>
            </Animated.View>
          </Container>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}
