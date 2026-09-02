export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    //   className={cn("antialiased", fontSans.variable, "font-mono", jetbrainsMono.variable, oxaniumHeading.variable)}
    >
      <body>
        {children}
        {/* <ThemeProvider>{children}</ThemeProvider> */}
      </body>
    </html>
  )
}