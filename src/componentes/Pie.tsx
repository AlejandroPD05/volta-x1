/** Pie de página: la letra pequeña honesta. */
export function Pie() {
  return (
    <footer className="relative border-t border-white/5 bg-[#05060a] py-10">
      <div className="texto-apagado mx-auto flex w-[min(1120px,90vw)] flex-col items-center justify-between gap-4 text-xs sm:flex-row">
        <p>
          © 2026 VOLTA — marca ficticia creada para la demo de portfolio de{' '}
          <a
            href="https://alejandropd05.github.io/portfolio/"
            target="_blank"
            rel="noreferrer"
            className="texto-acento hover:underline"
          >
            Alejandro Prieto Díez
          </a>
          .
        </p>
        <p className="font-mono">React Three Fiber · GSAP · Tailwind</p>
      </div>
    </footer>
  )
}
