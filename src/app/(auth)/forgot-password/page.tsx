"use client";

import { useState } from "react";
import Link from "next/link";
import { useSupabaseContext } from "@/lib/context";
import { useForm } from "@mantine/form";
import {
  TextInput,
  Button,
  Paper,
  Title,
  Text,
  Alert,
  Stack,
  Anchor,
  Box,
} from "@mantine/core";
import { IconMail, IconAlertCircle, IconCheck } from "@tabler/icons-react";

export default function ForgotPasswordPage() {
  const supabase = useSupabaseContext();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    mode: "uncontrolled",
    initialValues: {
      email: "",
    },
    validate: {
      email: (value) => {
        if (!value) return "이메일을 입력해주세요";
        if (!/^\S+@\S+$/.test(value)) return "올바른 이메일 형식이 아닙니다";
        return null;
      },
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setIsLoading(true);
    setError(null);

    try {
      // Supabase는 Site URL로 리다이렉트 후 hash fragment에 토큰을 포함
      // reset-password 페이지에서 hash fragment를 처리하도록 설정
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        values.email,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (resetError) {
        setError(resetError.message);
      } else {
        setIsSubmitted(true);
      }
    } catch {
      setError("비밀번호 재설정 이메일 전송 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

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
            비밀번호 찾기
          </Title>
          <Text c="dimmed" size="sm" ta="center">
            가입하신 이메일로 재설정 링크를 보내드립니다
          </Text>
        </Stack>

        {isSubmitted ? (
          <Stack gap="md">
            <Alert
              icon={<IconCheck size={16} />}
              color="green"
              variant="light"
              radius="md"
            >
              비밀번호 재설정 이메일을 발송했습니다.
              <br />
              이메일을 확인해주세요.
            </Alert>
            <Text size="sm" c="dimmed" ta="center">
              이메일이 도착하지 않았다면 스팸 폴더를 확인해주세요.
            </Text>
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
              로그인으로 돌아가기
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

              <TextInput
                label="이메일"
                placeholder="가입하신 이메일 주소"
                leftSection={<IconMail size={18} stroke={1.5} color="var(--text-tertiary)" />}
                key={form.key("email")}
                {...form.getInputProps("email")}
                autoComplete="email"
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
                재설정 링크 보내기
              </Button>
            </Stack>
          </form>
        )}

        <Text ta="center" mt="xl" size="sm" c="dimmed">
          <Anchor component={Link} href="/login" c="dark">
            로그인으로 돌아가기
          </Anchor>
        </Text>
      </Paper>
    </Box>
  );
}
