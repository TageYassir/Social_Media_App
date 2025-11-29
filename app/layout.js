export const metadata = {
  title: "My App",
  description: "Admin UI",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head />
      <body>{children}</body>
    </html>
  )
}