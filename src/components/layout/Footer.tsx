import React from 'react'
import Link from 'next/link'
import { Github, Twitter, Mail, Heart } from 'lucide-react'

const socialLinks = [
  { icon: Github, href: 'https://github.com/username', label: 'GitHub' },
  { icon: Twitter, href: 'https://twitter.com/username', label: 'Twitter' },
  { icon: Mail, href: 'mailto:hello@example.com', label: 'Email' },
]

const footerLinks = [
  { label: '首页', href: '/' },
  { label: '关于我', href: '/about' },
  { label: 'RSS', href: '/rss.xml' },
]

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-background-base mt-auto">
      <div className="page-container py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-brand-orange rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">Q</span>
              </div>
              <span className="text-xl font-bold text-text-primary">Qzhou Blog</span>
            </Link>
            <p className="text-sm text-text-muted leading-relaxed">
              分享技术心得，记录成长历程。
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">快速链接</h3>
            <div className="flex flex-col space-y-2">
              {footerLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-text-secondary hover:text-brand-orange transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Social Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">关注我</h3>
            <div className="flex space-x-4">
              {socialLinks.map(social => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-button hover:bg-background-hover transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5 text-text-secondary" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-border">
          <p className="text-center text-sm text-text-muted flex items-center justify-center space-x-1">
            <span>© {currentYear} Qzhou Blog. Made with</span>
            <Heart className="w-4 h-4 text-red-500" />
            <span>using Next.js</span>
          </p>
        </div>
      </div>
    </footer>
  )
}