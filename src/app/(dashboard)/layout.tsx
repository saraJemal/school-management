import Menu from "@/components/Menu";
import Navbar from "@/components/Navbar";
import Link from "next/link";
export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-screen flex overflow-y-auto overflow-x-hidden [scrollbar-width:none]
        hover:[scrollbar-width:thin]
        [&::-webkit-scrollbar]:w-0
        hover:[&::-webkit-scrollbar]:w-2
        [&::-webkit-scrollbar-thumb]:bg-gray-400
        [&::-webkit-scrollbar-thumb]:rounded-full
        [&::-webkit-scrollbar-track]:bg-transparent">
     {/*left side*/} 
     <div className="w-[14%] md:w-[8%] lg:w-[16%] xl:w-[14%]">
      <Link href="/" className="flex items-center justify-center lg:justify-start gap-2">
        <img src="/badirLogo.png" alt="Logo" width={32} height={32} />
        <span className="hidden lg:block font-bold">Badir Academy</span>
      </Link>
      <Menu/>
     </div>
     {/*right side*/}
     <div className="w-[86%] md:w-[92%] lg:w-[84%] xl:w-[86%] bg-[#F7F8FA] flex flex-col h-full overflow-y-auto overflow-x-hidden
        [scrollbar-width:none]
        hover:[scrollbar-width:thin]
        [&::-webkit-scrollbar]:w-0
        hover:[&::-webkit-scrollbar]:w-2
        [&::-webkit-scrollbar-thumb]:bg-gray-400
        [&::-webkit-scrollbar-thumb]:rounded-full
        [&::-webkit-scrollbar-track]:bg-transparent">
      <Navbar/>
      {children}
     </div>
     </div>
  );
}