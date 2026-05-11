type GitHubRibbonProps = {
  href: string;
};

export default function GitHubRibbon({
  href,
}: GitHubRibbonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed top-0 right-0 z-50 group"
    >

      <div
        className="
          w-0 h-0
          border-l-90 border-l-transparent
          border-t-90 border-t-white
          transition-all duration-200
          group-hover:border-t-110
          group-hover:border-l-110
        "
      />

      <img
        src="https://apqsehnfehgcygadnrgq.supabase.co/storage/v1/object/public/Assets/icons/GitHub.png"
        alt="GitHub"
        className="
          absolute top-2 right-1
          w-10 h-10
          object-contain
        "
      />
    </a>
  );
}