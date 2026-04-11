import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_consulting/consulting")({
  component: ConsultingPage,
});

function ConsultingPage() {
  return <ConsultingLandingPage />;
}

export function ConsultingLandingPage() {
  const handleSubmit = React.useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const subjectValue = String(formData.get("subject") ?? "").trim();
    const messageValue = String(formData.get("message") ?? "").trim();

    const subject = subjectValue !== "" ? subjectValue : "Contact from Adranna Systems website";
    const body = messageValue;

    const mailtoUrl = new URL("mailto:a.buchel@outlook.com");
    mailtoUrl.searchParams.set("subject", subject);
    mailtoUrl.searchParams.set("body", body);
    window.location.href = mailtoUrl.toString();
  }, []);

  return (
    <div>
      <section className="bg-gradient-to-br from-blue-50 to-indigo-50 pt-16 pb-20">
        <div className="container mx-auto px-6">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-6 text-5xl font-bold text-gray-900">
              Transforming Business Through Technology
            </h1>
            <p className="mb-8 text-xl text-gray-600">
              Expert IT development, management, and cyber security consulting services to protect
              and advance your business
            </p>
            <a
              href="#contact"
              className="rounded-lg bg-blue-600 px-8 py-3 text-white transition duration-300 hover:bg-blue-700"
            >
              Get in Touch
            </a>
          </div>
        </div>
      </section>

      <section id="services" className="bg-white py-20">
        <div className="container mx-auto px-6">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">Our Services</h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-gray-200 p-6 transition duration-300 hover:shadow-lg">
              <h3 className="mb-4 text-xl font-semibold text-gray-900">IT Development</h3>
              <p className="text-gray-600">
                Custom software solutions, web applications, and enterprise systems tailored to your
                specific business requirements.
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-6 transition duration-300 hover:shadow-lg">
              <h3 className="mb-4 text-xl font-semibold text-gray-900">IT Management</h3>
              <p className="text-gray-600">
                Strategic IT leadership, infrastructure optimization, and technology roadmap
                development for sustainable growth.
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-6 transition duration-300 hover:shadow-lg">
              <h3 className="mb-4 text-xl font-semibold text-gray-900">Cyber Security</h3>
              <p className="text-gray-600">
                Comprehensive security assessments, threat prevention, and robust protection
                strategies for your digital assets.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="bg-gray-50 py-20">
        <div className="container mx-auto px-6">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-8 text-center text-3xl font-bold text-gray-900">About Us</h2>
            <p className="mb-6 text-gray-600">
              Adranna Systems is a specialized IT consultancy focusing on development, management,
              and cyber security. We deliver comprehensive technology solutions that help businesses
              thrive in an increasingly digital world.
            </p>
            <p className="text-gray-600">
              Our team brings together extensive experience in software development, IT management,
              and cyber security, ensuring that every project benefits from both technical
              excellence and security-first thinking.
            </p>
          </div>
        </div>
      </section>

      <section id="contact" className="bg-white py-20">
        <div className="container mx-auto px-6">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">Get in Touch</h2>
          <div className="mx-auto max-w-lg">
            <form id="contactForm" className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-gray-700" htmlFor="subject">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-gray-700" htmlFor="message">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-blue-600 px-6 py-3 text-white transition duration-300 hover:bg-blue-700"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 py-12 text-white">
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <div className="mb-4 text-xl font-bold md:mb-0">Adranna Systems</div>
            <div className="text-sm text-gray-400">
              © 2024-{new Date().getFullYear()} Adranna Systems. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
