import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { useAuth } from "../store/authStore";
import { ECONOMY_PRICING_QUERY, CREDITS_BALANCE_QUERY } from "../graphql";

interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: number;
  bonus?: number;
  popular?: boolean;
}

interface Message {
  t: string;
  o: boolean;
}

export default function Credits() {
  const { token } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState<Message | null>(null);

  // GraphQL queries
  const { data: pricingData } = useQuery(ECONOMY_PRICING_QUERY, {
    fetchPolicy: "cache-and-network",
  });

  const { data: balanceData, refetch: refetchBalance } = useQuery(CREDITS_BALANCE_QUERY, {
    fetchPolicy: "cache-and-network",
    skip: !token,
  });

  const packs: CreditPack[] = pricingData?.economyPricing || [];
  const balance = balanceData?.creditsBalance?.credits || 0;

  // Check for founder pack availability (default to showing if not specified)
  const foundersLeft = 100; // This would come from backend if we add it to schema

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success")) {
      setMsg({ t: "Payment successful! Credits added.", o: true });
      refetchBalance();
    }
    if (params.get("canceled")) {
      setMsg({ t: "Payment canceled.", o: false });
    }
  }, [refetchBalance]);

  // Checkout still uses REST because Stripe returns a redirect URL
  async function buy(packId: string) {
    setLoading(packId);
    try {
      const res = await fetch("/api/credits/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ packId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setMsg({
          t: data.error?.message || data.error || "Failed",
          o: false,
        });
      }
    } catch (_e) {
      setMsg({ t: "Network error", o: false });
    }
    setLoading(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 text-white pb-12">
      {msg && (
        <div
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-8 py-4 rounded-2xl shadow-2xl text-lg font-bold ${
            msg.o ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {msg.t}
        </div>
      )}
      <header className="bg-gray-900/80 backdrop-blur-lg p-5 sticky top-0 z-10 border-b border-gray-700">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/dashboard" className="text-blue-400 text-lg">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold">💳 Credits</h1>
          <div className="bg-purple-600 px-4 py-2 rounded-full font-bold">
            {balance.toLocaleString()}
          </div>
        </div>
      </header>
      <div className="max-w-5xl mx-auto p-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-2">Power Your Journey</h2>
          <p className="text-gray-400">
            1 credit = 1% progress toward your goals. Every credit represents
            real work.
          </p>
        </div>
        {foundersLeft > 0 && (
          <div className="bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 rounded-3xl p-8 mb-8 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-6xl">👑</span>
                <h3 className="text-2xl font-bold">Founding Member</h3>
                <p className="opacity-90">Lifetime access + unlimited credits</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold">$49.99</div>
                <div className="text-sm opacity-80">
                  {foundersLeft}/100 remaining
                </div>
              </div>
            </div>
            <button
              onClick={() => buy("founder")}
              disabled={loading === "founder"}
              className="w-full bg-black/30 hover:bg-black/50 py-4 rounded-2xl font-bold text-lg transition-all"
            >
              {loading === "founder" ? "Processing..." : "Become a Founder"}
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {packs
            .filter((p) => p.id !== "founder")
            .map((pack) => (
              <div
                key={pack.id}
                className={`bg-gray-800 rounded-2xl p-6 shadow-xl ${
                  pack.popular ? "ring-2 ring-purple-500" : ""
                }`}
              >
                {pack.popular && (
                  <div className="bg-purple-500 text-xs px-3 py-1 rounded-full inline-block mb-3 font-bold">
                    MOST POPULAR
                  </div>
                )}
                <h3 className="text-xl font-bold mb-2">{pack.name}</h3>
                <div className="text-3xl font-bold text-purple-400 mb-2">
                  {pack.credits.toLocaleString()}{" "}
                  <span className="text-lg text-gray-400">credits</span>
                </div>
                <div className="text-2xl font-bold mb-4">
                  ${(pack.price / 100).toFixed(2)}
                </div>
                <button
                  onClick={() => buy(pack.id)}
                  disabled={loading === pack.id}
                  className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded-xl font-bold transition-all"
                >
                  {loading === pack.id ? "Processing..." : "Buy Now"}
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
