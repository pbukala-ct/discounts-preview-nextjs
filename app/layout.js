// app/layout.js
import './globals.css'
import './styles/colors.css'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}