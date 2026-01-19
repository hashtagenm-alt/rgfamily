"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthContext } from "@/lib/context";
import { useForm } from "@mantine/form";
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Text,
  Alert,
  Stack,
  Loader,
  Anchor,
  Box,
} from "@mantine/core";
import { IconMail, IconLock, IconAlertCircle } from "@tabler/icons-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const { signIn, isAuthenticated, isLoading: authLoading } = useAuthContext();

  const form = useForm({
    mode: "uncontrolled",
    initialValues: {
      email: "",
      password: "",
    },
    validate: {
      email: (value) => (!value ? "이메일을 입력해주세요" : null),
      password: (value) => (!value ? "비밀번호를 입력해주세요" : null),
    },
  });

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push(redirect);
    }
  }, [isAuthenticated, authLoading, router, redirect]);

  const handleSubmit = async (values: typeof form.values) => {
    form.clearErrors();

    try {
      const { error } = await signIn(values.email, values.password);
      if (error) {
        form.setErrors({
          email:
            error.message === "Invalid login credentials"
              ? "이메일 또는 비밀번호가 올바르지 않습니다."
              : error.message,
        });
      } else {
        router.push(redirect);
      }
    } catch {
      form.setErrors({ email: "로그인 중 오류가 발생했습니다." });
    }
  };

  if (authLoading) {
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
            로그인
          </Title>
          <Text c="dimmed" size="sm" ta="center">
            RG 패밀리에 오신 것을 환영합니다
          </Text>
        </Stack>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            {form.errors.email && !form.errors.password && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                color="red"
                variant="light"
                radius="md"
              >
                {form.errors.email}
              </Alert>
            )}

            <TextInput
              label="이메일 / 아이디"
              placeholder="이메일 또는 아이디"
              leftSection={<IconMail size={18} stroke={1.5} color="var(--text-tertiary)" />}
              key={form.key("email")}
              {...form.getInputProps("email")}
              autoComplete="username"
              size="md"
              radius="md"
            />

            <PasswordInput
              label="비밀번호"
              placeholder="비밀번호를 입력하세요"
              leftSection={<IconLock size={18} stroke={1.5} color="var(--text-tertiary)" />}
              key={form.key("password")}
              {...form.getInputProps("password")}
              autoComplete="current-password"
              size="md"
              radius="md"
            />

            <Button
              type="submit"
              fullWidth
              size="md"
              radius="md"
              color="dark"
              loading={form.submitting}
              loaderProps={{ type: "dots" }}
              mt="sm"
            >
              로그인
            </Button>

            <Text ta="center" size="xs" c="dimmed">
              <Anchor component={Link} href="/find-email" c="dimmed" size="xs">
                아이디 찾기
              </Anchor>
              {" | "}
              <Anchor component={Link} href="/forgot-password" c="dimmed" size="xs">
                비밀번호 찾기
              </Anchor>
            </Text>
          </Stack>
        </form>

        <Text ta="center" mt="xl" size="sm" c="dimmed">
          아직 계정이 없으신가요?{" "}
          <Anchor component={Link} href="/signup" fw={600} c="dark">
            회원가입
          </Anchor>
        </Text>
      </Paper>
    </Box>
  );
}
