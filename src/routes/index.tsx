import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const handleSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const formData = new FormData(event.currentTarget)
      const subjectValue = String(formData.get('subject') ?? '').trim()
      const messageValue = String(formData.get('message') ?? '').trim()

      const subject =
        subjectValue !== ''
          ? subjectValue
          : 'Contact from Adranna Systems website'
      const body = messageValue

      const mailtoUrl = `mailto:a.buchel@outlook.com?subject=${encodeURIComponent(
        subject,
      )}&body=${encodeURIComponent(body)}`
      window.location.href = mailtoUrl
    },
    [],
  )

  return (
    <div>
      <header className="bg-white shadow-sm fixed w-full z-10">
        <nav className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-gray-800">
              Adranna Systems
            </div>
            <div className="hidden md:flex space-x-8">
              <a
                href="#services"
                className="text-gray-600 hover:text-gray-900"
              >
                Services
              </a>
              <a
                href="#about"
                className="text-gray-600 hover:text-gray-900"
              >
                About
              </a>
              <a
                href="#contact"
                className="text-gray-600 hover:text-gray-900"
              >
                Contact
              </a>
            </div>
          </div>
        </nav>
      </header>

      <section className="pt-32 pb-20 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Transforming Business Through Technology
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Expert IT development, management, and cyber security consulting
              services to protect and advance your business
            </p>
            <a
              href="#contact"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition duration-300"
            >
              Get in Touch
            </a>
          </div>
        </div>
      </section>

      <section id="services" className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Our Services
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition duration-300">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                IT Development
              </h3>
              <p className="text-gray-600">
                Custom software solutions, web applications, and enterprise
                systems tailored to your specific business requirements.
              </p>
            </div>
            <div className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition duration-300">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                IT Management
              </h3>
              <p className="text-gray-600">
                Strategic IT leadership, infrastructure optimization, and
                technology roadmap development for sustainable growth.
              </p>
            </div>
            <div className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition duration-300">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Cyber Security
              </h3>
              <p className="text-gray-600">
                Comprehensive security assessments, threat prevention, and robust
                protection strategies for your digital assets.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
              About Us
            </h2>
            <p className="text-gray-600 mb-6">
              Adranna Systems is a specialized IT consultancy focusing on
              development, management, and cyber security. We deliver
              comprehensive technology solutions that help businesses thrive in
              an increasingly digital world.
            </p>
            <p className="text-gray-600">
              Our team brings together extensive experience in software
              development, IT management, and cyber security, ensuring that every
              project benefits from both technical excellence and security-first
              thinking.
            </p>
          </div>
        </div>
      </section>

      <section id="contact" className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Get in Touch
          </h2>
          <div className="max-w-lg mx-auto">
            <form id="contactForm" className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="subject">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="message">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-300"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-xl font-bold mb-4 md:mb-0">
              Adranna Systems
            </div>
            <div className="text-gray-400 text-sm">
              © 2024-2025 Adranna Systems. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
