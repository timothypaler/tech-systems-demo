"use client";

import { Menu, PackageSearch, Search, ShoppingBag, Sparkles, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function StoreHeader({ dark = false }: { dark?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className={`main-header shared-store-header ${dark ? "dark-header" : ""}`}>
      <Link className="brand" href="/" aria-label="Tech Systems demo home">
        <span className="store-brand-copy"><strong>TECH <span>SYSTEMS</span></strong><small>Systems integration</small></span>
      </Link>
      <nav className={menuOpen ? "nav-links nav-open" : "nav-links"}>
        <Link href="/shop">Shop</Link>
        <Link href="/builder">PC Builder</Link>
        <Link href="/ai">AI Advisor</Link>
        <Link href="/cctv">CCTV</Link>
        <Link href="/network">Network</Link>
        <Link href="/smart-home">Smart Home</Link>
      </nav>
      <div className="header-actions">
        <Dialog>
          <DialogTrigger asChild><button className="icon-button" aria-label="Search products"><Search size={19} /></button></DialogTrigger>
          <DialogContent className="store-search-dialog">
            <DialogHeader>
              <DialogTitle>Search the catalog</DialogTitle>
              <DialogDescription>Find a part, complete system, or business solution.</DialogDescription>
            </DialogHeader>
            <form action="/shop" method="get" className="global-search-form">
              <Search />
              <input name="q" autoFocus placeholder="Try “Ryzen”, “CCTV” or “UPS”" aria-label="Search catalog" />
              <button type="submit">Search catalog</button>
            </form>
            <div className="search-shortcuts">
              <span>Explore solutions</span>
              <div><Link href="/ai"><Sparkles size={15}/> Ask AI</Link><Link href="/cctv">CCTV</Link><Link href="/network">Network</Link><Link href="/smart-home">Smart home</Link><Link href="/power">Power</Link></div>
            </div>
          </DialogContent>
        </Dialog>
        <Link className="icon-button" href="/track" aria-label="Track an order"><PackageSearch size={19}/></Link>
        <Link className="icon-button" href="/account" aria-label="Open account"><UserRound size={19}/></Link>
        <Link className="icon-button bag-button" href="/shop#cart" aria-label="Open shopping cart"><ShoppingBag size={19} /></Link>
        <button className="menu-button" onClick={() => setMenuOpen((value) => !value)} aria-label="Toggle menu">{menuOpen ? <X /> : <Menu />}</button>
      </div>
    </header>
  );
}
