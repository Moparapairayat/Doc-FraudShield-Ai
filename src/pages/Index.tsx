import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, Zap, Lock, Eye, FileSearch, Brain, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { FeatureCard } from "@/components/FeatureCard";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/signup");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">FraudShield</span>
          </div>
          <nav className="flex items-center gap-4">
            {user ? (
              <Link to="/dashboard">
                <Button>Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/signin">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link to="/signup">
                  <Button>Get Started</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-3xl opacity-50" />

        <div className="container relative mx-auto px-4 py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm text-muted-foreground shadow-sm">
              <Zap className="h-4 w-4 text-primary" />
              <span>AI-Powered Document Analysis</span>
            </div>

            <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Advanced Document{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Fraud Detection
              </span>
            </h1>

            <p className="mb-10 text-lg text-muted-foreground md:text-xl">
              Upload any document and get comprehensive AI-powered fraud risk assessment
              with detailed explanations. Free, secure, and privacy-focused.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" onClick={handleGetStarted} className="gap-2">
                Start Free Analysis
                <ArrowRight className="h-4 w-4" />
              </Button>
              <a href="#how-it-works">
                <Button size="lg" variant="outline">
                  Learn More
                </Button>
              </a>
            </div>

            {/* Disclaimer */}
            <p className="mt-8 text-xs text-muted-foreground max-w-lg mx-auto">
              This tool provides fraud risk assessment and does not confirm document
              authenticity. Always verify documents with the issuing authority.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-b">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
              Advanced Detection Capabilities
            </h2>
            <p className="text-lg text-muted-foreground">
              Our AI analyzes multiple layers of your documents to detect potential fraud indicators.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={Brain}
              title="AI-Powered OCR"
              description="Extract and analyze text from PDFs and images with advanced optical character recognition."
              delay={0}
            />
            <FeatureCard
              icon={Eye}
              title="Visual Forensics"
              description="Detect image manipulation, compression artifacts, and editing inconsistencies."
              delay={100}
            />
            <FeatureCard
              icon={FileSearch}
              title="Metadata Analysis"
              description="Examine file properties, creation dates, and modification history."
              delay={200}
            />
            <FeatureCard
              icon={Lock}
              title="Consistency Checks"
              description="Cross-validate dates, names, and values across the document."
              delay={300}
            />
            <FeatureCard
              icon={Zap}
              title="Instant Results"
              description="Get comprehensive analysis in seconds with detailed explanations."
              delay={400}
            />
            <FeatureCard
              icon={Shield}
              title="Privacy First"
              description="Your documents are analyzed securely and belong only to you."
              delay={500}
            />
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">How It Works</h2>
            <p className="text-lg text-muted-foreground">Three simple steps to assess document risk</p>
          </div>

          <div className="mx-auto max-w-4xl">
            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Upload Document",
                  description: "Upload your PDF, JPG, or PNG file (max 10MB).",
                },
                {
                  step: "02",
                  title: "AI Analysis",
                  description: "Our AI performs comprehensive forensic analysis.",
                },
                {
                  step: "03",
                  title: "Get Risk Score",
                  description: "Receive a detailed risk assessment with explanations.",
                },
              ].map((item, index) => (
                <div
                  key={item.step}
                  className="relative text-center animate-fade-in"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-bold text-primary">
                    {item.step}
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-foreground">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 text-center">
            <Button size="lg" onClick={handleGetStarted}>
              Try It Free
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
                <Shield className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">FraudShield</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Free AI-powered document fraud risk assessment. Results are advisory only.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
