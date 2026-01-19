"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  Stack,
  Loader,
  Anchor,
  Box,
  ThemeIcon,
} from "@mantine/core";
import { IconMail, IconLock, IconUser, IconCheck } from "@tabler/icons-react";

export default function SignupPage() {
  const router = useRouter();
  const { signUp, isAuthenticated, isLoading: authLoading } = useAuthContext();
  const [success, setSuccess] = useState(false);

  const form = useForm({
    mode: "uncontrolled",
    initialValues: {
      nickname: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    validate: {
      nickname: (value) => {
        if (!value) return "닉네임을 입력해주세요";
        if (value.length < 2) return "닉네임은 2자 이상이어야 합니다";
        return null;
      },
      email: (value) => {
        if (!value) return "이메일을 입력해주세요";
        if (!/^\S+@\S+$/.test(value)) return "올바른 이메일 형식이 아닙니다";
        return null;
      },
      password: (value) => {
        if (!value) return "비밀번호를 입력해주세요";
        if (value.length < 6) return "비밀번호는 6자 이상이어야 합니다";
        return null;
      },
      confirmPassword: (value, values) => {
        if (!value) return "비밀번호 확인을 입력해주세요";
        if (value !== values.password) return "비밀번호가 일치하지 않습니다";
        return null;
      },
    },
  });

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const { error } = await signUp(
        values.email,
        values.password,
        values.nickname,
      );
      if (error) {
        if (error.message.includes("already registered")) {
          form.setFieldError("email", "이미 등록된 이메일입니다");
        } else {
          form.setFieldError("email", error.message);
        }
      } else {
        setSuccess(true);
      }
    } catch {
      form.setFieldError("email", "회원가입 중 오류가 발생했습니다");
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

  if (success) {
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
            boxShadow: "0 0 24px rgba(0, 0, 0, 0.15)",
          }}
        >
          <Stack align="center" gap="lg">
            <ThemeIcon size={64} radius="xl" color="gray" variant="light">
              <IconCheck size={32} />
            </ThemeIcon>
            <Title order={2} ta="center" c="dark">
              가입 완료!
            </Title>
            <Text c="dimmed" size="sm" ta="center" style={{ lineHeight: 1.6 }}>
              이메일 인증 링크를 발송했습니다.
              <br />
              이메일을 확인해주세요.
            </Text>
            <Button
              component={Link}
              href="/login"
              fullWidth
              size="md"
              radius="md"
              color="dark"
            >
              로그인하기
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
            회원가입
          </Title>
          <Text c="dimmed" size="sm" ta="center">
            RG 패밀리의 새로운 멤버가 되어주세요
          </Text>
        </Stack>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="닉네임"
              placeholder="닉네임을 입력하세요"
              leftSection={<IconUser size={18} stroke={1.5} color="var(--text-tertiary)" />}
              key={form.key("nickname")}
              {...form.getInputProps("nickname")}
              maxLength={20}
              size="md"
              radius="md"
            />

            <TextInput
              label="이메일"
              placeholder="example@email.com"
              leftSection={<IconMail size={18} stroke={1.5} color="var(--text-tertiary)" />}
              key={form.key("email")}
              {...form.getInputProps("email")}
              autoComplete="email"
              size="md"
              radius="md"
            />

            <PasswordInput
              label="비밀번호"
              placeholder="6자 이상 입력하세요"
              leftSection={<IconLock size={18} stroke={1.5} color="var(--text-tertiary)" />}
              key={form.key("password")}
              {...form.getInputProps("password")}
              autoComplete="new-password"
              size="md"
              radius="md"
            />

            <PasswordInput
              label="비밀번호 확인"
              placeholder="비밀번호를 다시 입력하세요"
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
              loading={form.submitting}
              loaderProps={{ type: "dots" }}
              mt="sm"
            >
              가입하기
            </Button>
          </Stack>
        </form>

        <Text ta="center" mt="xl" size="sm" c="dimmed">
          이미 계정이 있으신가요?{" "}
          <Anchor component={Link} href="/login" fw={600} c="dark">
            로그인
          </Anchor>
        </Text>
      </Paper>
    </Box>
  );
}
