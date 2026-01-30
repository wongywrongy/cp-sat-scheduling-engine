interface CourtHeaderProps {
  courtId: number;
}

export function CourtHeader({ courtId }: CourtHeaderProps) {
  return (
    <div className="bg-gray-100 p-2 font-semibold text-center border-b-2 border-gray-300">
      Court {courtId}
    </div>
  );
}
