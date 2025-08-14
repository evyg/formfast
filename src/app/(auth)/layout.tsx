export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="flex min-h-screen items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xl">
                F
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">FormFast</h1>
            <p className="text-gray-600 mt-2">Never fill the same form twice</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}