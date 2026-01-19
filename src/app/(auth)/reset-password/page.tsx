"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSupabaseContext } from "@/lib/context";
import { useForm } from "@mantine/form";
import {
  PasswordInput,
  Button,
  Paper,
  Title,
  Text,
  Alert,
  Stack,
  Anchor,
  Box,
  Loader,
} from "@mantine/core";
import { IconLock, IconAlertCircle, IconCheck } from "@tabler/icons-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useSupabaseContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  const form = useForm({
    mode: "uncontrolled",
    initialValues: {
      password: "",
      confirmPassword: "",
    },
    validate: {
      password: (value) => {
        if (!value) return "비밀번호를 입력해주세요";
        if (value.length < 6) return "비밀번호는 최소 6자 이상이어야 합니다";
        return null;
      },
      confirmPassword: (value, values) => {
        if (!value) return "비밀번호 확인을 입력해주세요";
        if (value !== values.password) return "비밀번호가 일치하지 않습니다";
        return null;
      },
    },
  });

  // URL에서 에러 확인 및 세션 유효성 검사
  useEffect(() => {
    const checkSession = async () => {
      // URL query params에서 에러 확인
      const errorParam = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (errorParam) {
        setError(errorDescription || "링크가 만료되었거나 유효하지 않습니다.");
        setIsValidSession(false);
        return;
      }

      // URL hash fragment에서 토큰 추출 (클라이언트 사이드)
      if (typeof window !== "undefined") {
        const hash = window.location.hash;
        if (hash) {
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          const type = params.get("type");

          if (accessToken && type === "recovery") {
            // 토큰으로 세션 설정
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || "",
            });

            if (!sessionError) {
              // URL에서 hash 제거
              window.history.replaceState(null, "", window.location.pathname);
              setIsValidSession(true);
              return;
            }
          }
        }
      }

      // 기존 세션 확인
      const { data: { session } } = await supabase.auth.getSession();
      setIsValidSession(!!session);
    };

    checkSession();
  }, [supabase, searchParams]);

  const handleSubmit = async (values: typeof form.values) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        setIsSuccess(true);
        // 3초 후 로그인 페이지로 이동
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      }
    } catch {
      setError("비밀번호 변경 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 세션 확인 중
  if (isValidSession === null) {
    return (
      <Box
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--background)",
        }}
      >
        <Loader color="gray" size="lg" />
      </Box>
    );
  }

  // 유효하지 않은 접근
  if (!isValidSession) {
    return (
      <Box
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          background: "var(--background)",
        }}
      >
        <Paper
          radius="lg"
          p="xl"
          withBorder
          style={{
            width: "100%",
            maxWidth: 420,
            backdropFilter: "blur(10px)",
            boxShadow: "0 0 24px rgba(0, 0, 0, 0.15)",
          }}
        >
          <Stack align="center" gap="md">
            <Anchor
              component={Link}
              href="/"
              fw={900}
              fz="xl"
              underline="never"
              style={{ letterSpacing: 2 }}
            >
              RG FAMILY
            </Anchor>
            <Alert
              icon={<IconAlertCircle size={16} />}
              color="red"
              variant="light"
              radius="md"
            >
              유효하지 않거나 만료된 링크입니다.
              <br />
              비밀번호 찾기를 다시 시도해주세요.
            </Alert>
            <Button
              component={Link}
              href="/forgot-password"
              fullWidth
              size="md"
              radius="md"
              color="dark"
              mt="sm"
            >
              비밀번호 찾기
            </Button>
          </Stack>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        background: "var(--background)",
      }}
    >
      <Paper
        radius="lg"
        p="xl"
        withBorder
        style={{
          width: "100%",
          maxWidth: 420,
          backdropFilter: "blur(10px)",
          boxShadow: "0 0 24px rgba(0, 0, 0, 0.15)",
        }}
      >
        <Stack align="center" mb="xl">
          <Anchor
            component={Link}
            href="/"
            fw={900}
            fz="xl"
            underline="never"
            style={{ letterSpacing: 2 }}
          >
            RG FAMILY
          </Anchor>
          <Title order={2} ta="center" c="dark">
            비밀번호 재설정
          </Title>
          <Text c="dimmed" size="sm" ta="center">
            새로운 비밀번호를 입력해주세요
          </Text>
        </Stack>

        {isSuccess ? (
          <Stack gap="md">
            <Alert
              icon={<IconCheck size={16} />}
              color="green"
              variant="light"
              radius="md"
            >
              비밀번호가 성공적으로 변경되었습니다.
              <br />
              잠시 후 로그인 페이지로 이동합니다.
            </Alert>
            <Button
              component={Link}
              href="/login"
              fullWidth
              size="md"
              radius="md"
              variant="light"
              color="dark"
              mt="sm"
            >
              로그인하기
            </Button>
          </Stack>
        ) : (
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              {error && (
                <Alert
                  icon={<IconAlertCircle size={16} />}
                  color="red"
                  variant="light"
                  radius="md"
                >
                  {error}
                </Alert>
              )}

              <PasswordInput
                label="새 비밀번호"
                placeholder="새 비밀번호 입력"
                leftSection={<IconLock size={18} stroke={1.5} color="var(--text-tertiary)" />}
                key={form.key("password")}
                {...form.getInputProps("password")}
                autoComplete="new-password"
                size="md"
                radius="md"
              />

              <PasswordInput
                label="비밀번호 확인"
                placeholder="비밀번호 다시 입력"
                leftSection={<IconLock size={18} stroke={1.5} color="var(--text-tertiary)" />}
                key={form.key("confirmPassword")}
                {...form.getInputProps("confirmPassword")}
                autoComplete="new-password"
                size="md"
                radius="md"
              />

              <Button
                type="submit"
                fullWidth
                size="md"
                radius="md"
                color="dark"
                loading={isLoading}
                loaderProps={{ type: "dots" }}
                mt="sm"
              >
                비밀번호 변경
              </Button>
            </Stack>
          </form>
        )}
      </Paper>
    </Box>
  );
}
