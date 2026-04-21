import { redirect } from "next/navigation";

export default async function VehicleIndex({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/v/${id}/fill-ups`);
}
