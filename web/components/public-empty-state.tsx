export function PublicEmptyState({
  message = "No published posts yet.",
}: {
  message?: string;
}) {
  return (
    <div className="py-20 text-center">
      <p className="text-base text-muted-foreground">{message}</p>
    </div>
  );
}
