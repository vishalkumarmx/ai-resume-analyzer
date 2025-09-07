import './globals.css'
import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'AI Resume Analyzer', description: 'Analyze resumes with ATS scoring and AI suggestions' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (<html lang='en'><body className='min-h-screen bg-gradient-to-b from-indigo-50 to-white'>{children}</body></html>)
}
