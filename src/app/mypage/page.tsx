"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuthContext } from "@/lib/context";
import { updateMyProfile, changePassword } from "@/lib/actions/profiles";
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Text,
  Stack,
  Group,
  Avatar,
  Badge,
  Loader,
  Box,
  Divider,
  Alert,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconUser,
  IconMail,
  IconLock,
  IconArrowLeft,
  IconCheck,
  IconAlertCircle,
} from "@tabler/icons-react";
import styles from "./page.module.css";

export default function MyPage() {
  const router = useRouter();
  const { user, profile, isAuthenticated, isLoading, signOut, refreshProfile } = useAuthContext();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Profile form
  const profileForm = useForm({
    mode: "uncontrolled",
    initialValues: {
      nickname: "",
    },
  });

  // Password form
  const passwordForm = useForm({
    mode: "uncontrolled",
    initialValues: {
      newPassword: "",
      confirmPassword: "",
    },
    validate: {
      newPassword: (value) =>
        value.length < 6 ? "비밀번호는 6자 이상이어야 합니다" : null,
      confirmPassword: (value, values) =>
        value !== values.newPassword ? "비밀번호가 일치하지 않습니다" : null,
    },
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login?redirect=/mypage");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (profile) {
      profileForm.setFieldValue("nickname", profile.nickname || "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const handleProfileSubmit = async (values: typeof profileForm.values) => {
    setSuccess(null);
    setError(null);

    const result = await updateMyProfile({ nickname: values.nickname });
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("프로필이 업데이트되었습니다.");
      await refreshProfile();
    }
  };

  const handlePasswordSubmit = async (values: typeof passwordForm.values) => {
    setSuccess(null);
    setError(null);

    const result = await changePassword(values.newPassword);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("비밀번호가 변경되었습니다.");
      passwordForm.reset();
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      superadmin: "red",
      admin: "orange",
      moderator: "blue",
      vip: "yellow",
      member: "gray",
    };
    const labels: Record<string, string> = {
      superadmin: "최고관리자",
      admin: "관리자",
      moderator: "운영자",
      vip: "VIP",
      member: "멤버",
    };
    return (
      <Badge color={colors[role] || "gray"} variant="light" size="sm">
        {labels[role] || role}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Box className={styles.loading}>
        <Loader color="gray" size="lg" />
      </Box>
    );
  }

  if (!isAuthenticated || !profile) {
    return null;
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Back Button */}
        <Link href="/" className={styles.backBtn}>
          <IconArrowLeft size={18} />
          <span>홈으로</span>
        </Link>

        {/* Header */}
        <header className={styles.header}>
          <Title order={1} className={styles.title}>
            마이페이지
          </Title>
          <Text c="dimmed" size="sm">
            프로필 정보를 확인하고 수정할 수 있습니다
          </Text>
        </header>

        {/* Alerts */}
        {success && (
          <Alert
            icon={<IconCheck size={16} />}
            color="green"
            variant="light"
            radius="md"
            mb="md"
            withCloseButton
            onClose={() => setSuccess(null)}
          >
            {success}
          </Alert>
        )}
        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            color="red"
            variant="light"
            radius="md"
            mb="md"
            withCloseButton
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Profile Card */}
        <Paper className={styles.card} radius="lg" p="xl" withBorder>
          <Group gap="lg" align="flex-start">
            <Avatar
              src={profile.avatar_url}
              size={80}
              radius="xl"
              color="gray"
            >
              {profile.nickname?.charAt(0).toUpperCase()}
            </Avatar>
            <div className={styles.profileInfo}>
              <Group gap="sm" align="center">
                <Text fw={700} size="xl">
                  {profile.nickname}
                </Text>
                {getRoleBadge(profile.role)}
              </Group>
              <Text c="dimmed" size="sm">
                {user?.email}
              </Text>
              {profile.total_donation > 0 && (
                <Text size="sm" c="dimmed" mt="xs">
                  총 후원: {profile.total_donation.toLocaleString()} 하트
                </Text>
              )}
            </div>
          </Group>
        </Paper>

        {/* Edit Profile */}
        <Paper className={styles.card} radius="lg" p="xl" withBorder>
          <Title order={3} mb="md">
            프로필 수정
          </Title>
          <form onSubmit={profileForm.onSubmit(handleProfileSubmit)}>
            <Stack gap="md">
              <TextInput
                label="닉네임"
                placeholder="닉네임을 입력하세요"
                leftSection={<IconUser size={18} stroke={1.5} />}
                key={profileForm.key("nickname")}
                {...profileForm.getInputProps("nickname")}
                size="md"
                radius="md"
              />
              <Button
                type="submit"
                color="dark"
                radius="md"
                loading={profileForm.submitting}
              >
                프로필 저장
              </Button>
            </Stack>
          </form>
        </Paper>

        {/* Change Password */}
        <Paper className={styles.card} radius="lg" p="xl" withBorder>
          <Title order={3} mb="md">
            비밀번호 변경
          </Title>
          <form onSubmit={passwordForm.onSubmit(handlePasswordSubmit)}>
            <Stack gap="md">
              <PasswordInput
                label="새 비밀번호"
                placeholder="새 비밀번호 (6자 이상)"
                leftSection={<IconLock size={18} stroke={1.5} />}
                key={passwordForm.key("newPassword")}
                {...passwordForm.getInputProps("newPassword")}
                size="md"
                radius="md"
              />
              <PasswordInput
                label="비밀번호 확인"
                placeholder="비밀번호를 다시 입력하세요"
                leftSection={<IconLock size={18} stroke={1.5} />}
                key={passwordForm.key("confirmPassword")}
                {...passwordForm.getInputProps("confirmPassword")}
                size="md"
                radius="md"
              />
              <Button
                type="submit"
                color="dark"
                radius="md"
                loading={passwordForm.submitting}
              >
                비밀번호 변경
              </Button>
            </Stack>
          </form>
        </Paper>

        <Divider my="xl" />

        {/* Logout */}
        <Button
          variant="outline"
          color="red"
          fullWidth
          radius="md"
          onClick={handleLogout}
        >
          로그아웃
        </Button>
      </div>
    </div>
  );
}
