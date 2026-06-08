const contactMessages: Record<string, string> = {
  error: "Sorry, your message could not be sent. Please try again.",
  "missing-fields": "Please fill in all required fields.",
  "not-configured": "The contact form is not configured yet.",
  success: "Thanks, your message has been sent.",
};

type ContactPageProps = {
  searchParams?: Promise<{
    contact?: string | string[];
  }>;
};

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const params = await searchParams;
  const status = getSearchParam(params?.contact);
  const message = status ? contactMessages[status] : null;

  return (
    <section className="bg-white p-7 shadow-sm sm:p-8">
      <h1 className="mb-6 text-3xl font-normal leading-tight text-[#222222]">
        Contact
      </h1>

      {message ? (
        <p className="mb-6 text-sm leading-6 text-[#555555]">{message}</p>
      ) : null}

      <form id="contact-form" action="/api/contact" method="post" className="space-y-5">
        <p>
          <label htmlFor="name" className="mb-2 block text-xs text-[#222222]">
            Your Name (required)
          </label>
          <input
            id="name"
            name="name"
            required
            type="text"
            className="w-full max-w-[260px] border border-zinc-100 bg-[#f7f8f9] px-3 py-2 text-sm outline-none focus:border-[#1e73be]"
          />
        </p>

        <p>
          <label htmlFor="email" className="mb-2 block text-xs text-[#222222]">
            Your Email (required)
          </label>
          <input
            id="email"
            name="email"
            required
            type="email"
            className="w-full max-w-[260px] border border-zinc-100 bg-[#f7f8f9] px-3 py-2 text-sm outline-none focus:border-[#1e73be]"
          />
        </p>

        <p>
          <label htmlFor="subject" className="mb-2 block text-xs text-[#222222]">
            Subject
          </label>
          <input
            id="subject"
            name="subject"
            required
            type="text"
            className="w-full max-w-[260px] border border-zinc-100 bg-[#f7f8f9] px-3 py-2 text-sm outline-none focus:border-[#1e73be]"
          />
        </p>

        <p>
          <label htmlFor="message" className="mb-2 block text-xs text-[#222222]">
            Your Message
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={10}
            className="w-full border border-zinc-100 bg-[#f7f8f9] px-3 py-2 text-sm outline-none focus:border-[#1e73be]"
          />
        </p>

        <button
          type="submit"
          className="bg-[#55555e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#222222]"
        >
          Send
        </button>
      </form>
    </section>
  );
}

function getSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}
