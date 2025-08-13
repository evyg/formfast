import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { FileDropzone } from '@/components/upload/file-dropzone';
import { Upload, Zap, Shield, Smartphone } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Never fill the same 
            <span className="text-blue-600"> form twice</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            FormFast uses AI-powered OCR to detect form fields and auto-fills them from your saved profile. 
            Upload, auto-fill, sign, and download - all in under 60 seconds.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" className="text-lg px-8 py-6">
              Try Free Demo
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6">
              Watch Demo
            </Button>
          </div>

          {/* Demo Upload Area */}
          <div className="max-w-md mx-auto">
            <FileDropzone 
              onFileSelect={(file) => console.log('Demo file:', file)}
              className="bg-white shadow-lg"
            />
            <p className="text-sm text-gray-500 mt-2">
              Try uploading a PDF or image to see the magic ✨
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How FormFast Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Three simple steps to never fill forms manually again
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">1. Upload Your Form</h3>
              <p className="text-gray-600">
                Drop any PDF or image form. Our AI instantly detects all fillable fields.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">2. Auto-Fill Magic</h3>
              <p className="text-gray-600">
                Your saved profile automatically populates all matching fields in seconds.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">3. Sign & Download</h3>
              <p className="text-gray-600">
                Add your signature, preview placement, and download your completed form.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Built for the mobile-first world
              </h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Smartphone className="w-6 h-6 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Mobile Optimized</h3>
                    <p className="text-gray-600">Perfect for filling forms on your phone or tablet</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Shield className="w-6 h-6 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Secure & Private</h3>
                    <p className="text-gray-600">Your data is encrypted and never sold to third parties</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Zap className="w-6 h-6 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Lightning Fast</h3>
                    <p className="text-gray-600">AI-powered processing in under 10 seconds</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Save Time Every Day</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Manual form filling</span>
                  <span className="font-semibold text-red-600">15+ minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">With FormFast</span>
                  <span className="font-semibold text-green-600">&lt;60 seconds</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Time saved</span>
                    <span className="font-bold text-blue-600">95%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to save hours every week?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of users who never fill the same form twice
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-transparent text-white border-white hover:bg-white hover:text-blue-600">
              View Pricing
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">
                F
              </div>
              <span className="text-xl font-bold">FormFast</span>
            </div>
            <p className="text-gray-400 mb-6">Never fill the same form twice</p>
            <div className="flex justify-center space-x-6 text-sm text-gray-400">
              <a href="/privacy" className="hover:text-white">Privacy</a>
              <a href="/terms" className="hover:text-white">Terms</a>
              <a href="/contact" className="hover:text-white">Contact</a>
              <a href="/help" className="hover:text-white">Help</a>
            </div>
            <div className="mt-6 text-sm text-gray-500">
              © 2024 FormFast. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
