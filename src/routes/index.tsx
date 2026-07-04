import { createFileRoute } from "@tanstack/react-router";
import { RoomGate } from "@/components/RoomGate";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tasky | 팀을 더 가볍게 움직이는 협업 보드" },
      {
        name: "description",
        content:
          "새총으로 업무를 요청하고, 퇴근 전 요청에는 작은 브레이크를 거는 팀원 친화형 협업 웹.",
      },
    ],
  }),
  component: Index,
  ssr: false,
});

function Index() {
  return (
    <RoomGate>
      <AppShell />
    </RoomGate>
  );
}
