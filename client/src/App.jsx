import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { Boxes, ChartColumnBig, CircleDollarSign, IndianRupee, Leaf, Map as MapIcon, MessageSquareText, Mic, ShoppingBag, ShoppingCart, Sparkles, Sprout, Store, Tractor, Warehouse } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AuthProvider, useAuth } from './context/AuthContext';
import translations from './i18n/translations';
import { api } from './services/api';

const features = [
  { icon: Leaf, title: 'Business management', description: 'Track products, orders, payments, and support from one dashboard.' },
  { icon: GlobeIcon, title: 'Multilingual UX', description: 'Switch between English, Hindi, and Marathi with a single tap.' },
  { icon: Mic, title: 'Voice-first flow', description: 'Use browser speech recognition for guided actions and checks.' },
  { icon: Store, title: 'Marketplace', description: 'Showcase local produce and handmade goods to nearby customers.' },
];

function GlobeIcon(props) {
  return <div {...props} className="text-2xl">🌍</div>;
}

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);

function isValidIndianPhone(value) {
  if (!/^\+?[\d\s().-]+$/.test(value)) return false;
  let digits = value.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits);
}

function ProductImage({ src, alt, className }) {
  const fallback = '/product-images/product-placeholder.svg';
  return (
    <img
      src={src || fallback}
      alt={alt}
      className={className}
      onError={(event) => {
        if (!event.currentTarget.src.endsWith(fallback)) {
          event.currentTarget.src = fallback;
        }
      }}
    />
  );
}

function App() {
  const [language, setLanguage] = useState(localStorage.getItem('rc-language') || 'en');
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('rc-cart') || '[]'));
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    localStorage.setItem('rc-language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('rc-cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const updateStatus = () => setOnline(navigator.onLine);
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell
          language={language}
          setLanguage={setLanguage}
          cart={cart}
          setCart={setCart}
          online={online}
          labels={translations[language] || translations.en}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

function AppShell({ language, setLanguage, cart, setCart, online, labels }) {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navItems = [
    { to: '/', label: labels.navHome },
    { to: '/marketplace', label: labels.navMarketplace },
    { to: '/dashboard', label: labels.navDashboard },
    { to: '/orders', label: labels.navOrders },
    { to: '/support', label: labels.navSupport },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-stone-50 text-slate-800">
      <header className="border-b border-stone-200 bg-white/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-3">
            <NavLink to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-soft">
                <Leaf className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-bold text-brand-700">RuralConnect</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-stone-500">Village commerce</div>
              </div>
            </NavLink>

            <nav className="hidden items-center gap-6 md:flex">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => `text-sm font-medium ${isActive ? 'text-brand-700' : 'text-slate-600 hover:text-brand-600'}`}>
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${online ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {online ? 'Online' : 'Offline'}
              </span>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded-xl border border-stone-200 bg-stone-50 px-2 py-1.5 text-sm outline-none focus:border-brand-500">
                <option value="en">English</option>
                <option value="hi">हिन्दी</option>
                <option value="mr">मराठी</option>
              </select>

              <NavLink to="/marketplace" className="relative hidden sm:flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm font-medium text-slate-700">
                <ShoppingCart className="h-4 w-4" />
                <span>{cart.length}</span>
              </NavLink>

              {user ? (
                <>
                  <span className="hidden rounded-full bg-brand-50 px-3 py-1.5 text-sm text-brand-700 md:inline">{user.fullName}</span>
                  <button onClick={handleLogout} className="rounded-xl bg-stone-900 px-3 py-2 text-sm font-medium text-white">Logout</button>
                </>
              ) : (
                <NavLink to="/auth" className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-soft">{labels.login}</NavLink>
              )}

              <button onClick={() => setMobileNavOpen((prev) => !prev)} className="rounded-xl border border-stone-200 p-2 md:hidden">
                <span className="block h-0.5 w-5 bg-slate-700" />
                <span className="mt-1 block h-0.5 w-5 bg-slate-700" />
                <span className="mt-1 block h-0.5 w-5 bg-slate-700" />
              </button>
            </div>
          </div>
        </div>

        {mobileNavOpen && (
          <div className="border-t border-stone-200 bg-white md:hidden">
            <div className="mx-auto max-w-7xl space-y-2 px-4 py-3">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} onClick={() => setMobileNavOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-stone-100">
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<LandingPage labels={labels} />} />
          <Route path="/auth" element={<AuthPage labels={labels} />} />
          <Route path="/dashboard" element={<DashboardPage labels={labels} />} />
          <Route path="/marketplace" element={<MarketplacePage labels={labels} cart={cart} setCart={setCart} />} />
          <Route path="/cart" element={<CartPage labels={labels} cart={cart} setCart={setCart} />} />
          <Route path="/orders" element={<OrdersPage labels={labels} />} />
          <Route path="/products" element={<ProductsPage labels={labels} />} />
          <Route path="/inventory" element={<InventoryPage labels={labels} />} />
          <Route path="/analytics" element={<AnalyticsPage labels={labels} />} />
          <Route path="/support" element={<SupportPage labels={labels} />} />
        </Routes>
      </main>
    </div>
  );
}

function LandingPage({ labels }) {
  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-50 via-white to-emerald-100 p-8 shadow-soft sm:p-12">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-brand-700 shadow-sm">
              <Sprout className="h-4 w-4" />
              Smart rural commerce ecosystem
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">{labels.heroTitle}</h1>
            <p className="max-w-xl text-lg text-slate-600">{labels.heroSubtitle}</p>
            <div className="flex flex-wrap gap-3">
              <NavLink to="/auth" className="rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white shadow-soft">{labels.signup}</NavLink>
              <NavLink to="/marketplace" className="rounded-xl border border-stone-300 bg-white px-5 py-3 font-semibold text-slate-700">Explore market</NavLink>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-5 shadow-soft">
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard icon={<Tractor className="h-5 w-5" />} label="Farm output" value="2.4k kg" />
              <StatCard icon={<ShoppingBag className="h-5 w-5" />} label="Orders" value="389" />
              <StatCard icon={<CircleDollarSign className="h-5 w-5" />} label="Revenue" value="₹92k" />
              <StatCard icon={<MessageSquareText className="h-5 w-5" />} label="Support" value="24" />
            </div>
            <div className="mt-5 rounded-2xl bg-gradient-to-br from-emerald-100 to-brand-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500">This week</div>
                  <div className="text-2xl font-bold text-brand-700">+18.4%</div>
                </div>
                <div className="rounded-xl bg-white p-2 text-brand-600"><ChartColumnBig className="h-7 w-7" /></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-slate-900">{labels.features}</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">{title}</h3>
              <p className="text-sm text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <InfoPanel title={labels.multilingual} icon={<MapIcon className="h-5 w-5" />} description="Serve customers in English, Hindi, and Marathi with consistent UI flows." />
        <InfoPanel title={labels.voice} icon={<Mic className="h-5 w-5" />} description="Use speech recognition to open pages, view products, and navigate quickly." />
        <InfoPanel title={labels.offline} icon={<Boxes className="h-5 w-5" />} description="Cached essentials remain available offline while sensitive network actions stay protected." />
      </section>
    </div>
  );
}

function AuthPage({ labels }) {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [loginMethod, setLoginMethod] = useState('email');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', role: 'CUSTOMER', businessName: '', category: '', location: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    if (!form.password) {
      setMessage('Enter your password.');
      return;
    }
    if (mode === 'login') {
      const identifier = loginMethod === 'email' ? form.email.trim() : form.phone.trim();
      if (!identifier) {
        setMessage(loginMethod === 'email' ? 'Enter your email address.' : 'Enter your phone number.');
        return;
      }
      if (loginMethod === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
        setMessage(labels.invalidEmail);
        return;
      }
      if (loginMethod === 'phone' && !isValidIndianPhone(identifier)) {
        setMessage(labels.invalidPhone);
        return;
      }
    } else {
      if (!form.fullName.trim()) {
        setMessage('Enter your full name.');
        return;
      }
      if (!form.email.trim() && !form.phone.trim()) {
        setMessage(labels.requiredContact);
        return;
      }
      if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        setMessage(labels.invalidEmail);
        return;
      }
      if (form.phone.trim() && !isValidIndianPhone(form.phone.trim())) {
        setMessage(labels.invalidPhone);
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        fullName: form.fullName,
        email: form.email || undefined,
        phone: form.phone || undefined,
        password: form.password,
        role: form.role,
        businessName: form.businessName,
        category: form.category,
        location: form.location,
      };

      if (mode === 'register') {
        await register(payload);
      } else {
        await login({
          [loginMethod]: loginMethod === 'email' ? form.email.trim() : form.phone.trim(),
          password: form.password,
        });
      }
      navigate('/dashboard');
    } catch (error) {
      setMessage(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="rounded-[2rem] bg-gradient-to-br from-brand-700 to-brand-900 p-8 text-white shadow-soft">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
          <Leaf className="h-6 w-6" />
        </div>
        <h2 className="mb-3 text-3xl font-bold">{labels.authTitle}</h2>
        <p className="text-brand-50">Connect rural businesses and customers through one inclusive platform.</p>
        <div className="mt-8 space-y-4 text-sm text-brand-50">
          <div className="flex gap-3"><Store className="h-5 w-5" /> Reach customers with local products and trusted inventory.</div>
          <div className="flex gap-3"><Warehouse className="h-5 w-5" /> Run logistics, support, and operational dashboard in one place.</div>
          <div className="flex gap-3"><Sparkles className="h-5 w-5" /> Access multilingual and voice-ready features designed for ease of use.</div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex rounded-xl bg-stone-100 p-1">
          <button type="button" onClick={() => setMode('login')} className={`flex-1 rounded-lg px-3 py-2 font-semibold ${mode === 'login' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`}>{labels.login}</button>
          <button type="button" onClick={() => setMode('register')} className={`flex-1 rounded-lg px-3 py-2 font-semibold ${mode === 'register' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`}>{labels.register}</button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          {mode === 'register' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={labels.fullName} value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} />
              <Field label={labels.role} value={form.role} onChange={(v) => setForm({ ...form, role: v })} select options={[['CUSTOMER', labels.customer], ['ENTREPRENEUR', labels.entrepreneur]]} />
            </div>
          )}

          {mode === 'login' ? (
            <>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-stone-100 p-1" role="group" aria-label="Login method">
                <button
                  type="button"
                  aria-pressed={loginMethod === 'email'}
                  onClick={() => { setLoginMethod('email'); setMessage(''); }}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${loginMethod === 'email' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600'}`}
                >
                  {labels.loginWithEmail}
                </button>
                <button
                  type="button"
                  aria-pressed={loginMethod === 'phone'}
                  onClick={() => { setLoginMethod('phone'); setMessage(''); }}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${loginMethod === 'phone' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600'}`}
                >
                  {labels.loginWithPhone}
                </button>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  {loginMethod === 'email' ? labels.email : labels.phone}
                </span>
                <input
                  type={loginMethod === 'email' ? 'email' : 'tel'}
                  autoComplete={loginMethod === 'email' ? 'email' : 'tel'}
                  inputMode={loginMethod === 'phone' ? 'tel' : undefined}
                  value={loginMethod === 'email' ? form.email : form.phone}
                  onChange={(event) => setForm({ ...form, [loginMethod]: event.target.value })}
                  required
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 outline-none focus:border-brand-500"
                  aria-label={loginMethod === 'email' ? labels.email : labels.phone}
                />
              </label>
            </>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={labels.email} type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <Field label={labels.phone} type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <p className="text-xs text-slate-500 sm:col-span-2">{labels.requiredContact}</p>
            </div>
          )}

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">{labels.password}</span>
            <span className="flex rounded-xl border border-stone-200 bg-stone-50 focus-within:border-brand-500">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                required
                className="min-w-0 flex-1 rounded-l-xl bg-transparent px-3 py-2.5 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="rounded-r-xl px-3 text-sm font-medium text-brand-700"
                aria-label={showPassword ? labels.hidePassword : labels.showPassword}
              >
                {showPassword ? labels.hidePassword : labels.showPassword}
              </button>
            </span>
          </label>

          {form.role === 'ENTREPRENEUR' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={labels.businessName} value={form.businessName} onChange={(v) => setForm({ ...form, businessName: v })} />
              <Field label={labels.category} value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
              <Field label={labels.location} value={form.location} onChange={(v) => setForm({ ...form, location: v })} className="sm:col-span-2" />
            </div>
          )}

          {message && <div role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{message}</div>}

          <button type="submit" disabled={loading} className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white disabled:opacity-60">
            {loading ? 'Please wait...' : mode === 'login' ? labels.login : labels.register}
          </button>
        </form>
      </div>
    </div>
  );
}

function DashboardPage({ labels }) {
  const { token, user } = useAuth();
  const [stats, setStats] = useState({ totalProducts: 0, totalOrders: 0, pendingOrders: 0, confirmedOrders: 0, shippedOrders: 0, deliveredOrders: 0, availableInventory: 0, totalSales: 0, lowStock: 0, outOfStock: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const toLoad = async () => {
      if (!token) return;
      try {
        const response = await api.getDashboardData(token);
        setStats(response.stats || stats);
      } catch (err) {
        setError(err.message || labels.apiUnavailable);
      } finally {
        setLoading(false);
      }
    };

    toLoad();
  }, [token]);

  const chartData = [
    { name: 'Jan', sales: 1200 },
    { name: 'Feb', sales: 1700 },
    { name: 'Mar', sales: 2500 },
    { name: 'Apr', sales: 2200 },
    { name: 'May', sales: 3000 },
    { name: 'Jun', sales: 3400 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-brand-700">{labels.dashboard}</p>
          <h2 className="text-3xl font-bold text-slate-900">Welcome, {user?.fullName || 'Entrepreneur'}</h2>
        </div>
        <div className="flex gap-3">
          <NavLink to="/products" className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Add Product</NavLink>
          <NavLink to="/inventory" className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Manage Inventory</NavLink>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total products" value={stats.totalProducts} icon={<ShoppingBag className="h-5 w-5" />} />
        <MetricCard title="Total sales" value={formatCurrency(stats.totalSales)} icon={<IndianRupee className="h-5 w-5" />} />
        <MetricCard title="Pending orders" value={stats.pendingOrders} icon={<Boxes className="h-5 w-5" />} />
        <MetricCard title="Inventory" value={stats.availableInventory} icon={<Warehouse className="h-5 w-5" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
        <div className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">Sales overview</h3>
            <span className="text-sm text-slate-500">Monthly trend</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="name" stroke="#78716c" />
              <YAxis stroke="#78716c" />
              <Tooltip formatter={(value) => `₹${value}`} />
              <Bar dataKey="sales" fill="#236a2d" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-xl font-bold text-slate-900">Order status</h3>
          <div className="space-y-3">
            {[
              { label: 'Pending', value: stats.pendingOrders },
              { label: 'Confirmed', value: stats.confirmedOrders },
              { label: 'Shipped', value: stats.shippedOrders },
              { label: 'Delivered', value: stats.deliveredOrders },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-xl bg-stone-50 p-3">
                <span className="text-sm text-slate-600">{item.label}</span>
                <span className="font-semibold text-slate-800">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MarketplacePage({ labels, cart, setCart }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await api.getProducts();
        setProducts(response.products || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  const categories = ['all', ...new Set(products.map((p) => p.category))];
  const filteredProducts = products.filter((product) => {
    const matchesText = product.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || product.category === category;
    return matchesText && matchesCategory && product.available;
  });

  const addToCart = (product) => {
    const item = cart.find((entry) => entry.id === product.id);
    if (item) {
      if (item.quantity >= product.stock) return;
      setCart((prev) => prev.map((entry) => (entry.id === product.id ? { ...entry, quantity: entry.quantity + 1 } : entry)));
    } else {
      setCart((prev) => [...prev, { ...product, quantity: 1 }]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-brand-700">{labels.navMarketplace}</p>
          <h2 className="text-3xl font-bold text-slate-900">{labels.marketplaceIntro}</h2>
        </div>
        <NavLink to="/cart" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white">
          <ShoppingCart className="h-4 w-4" /> {labels.cart} ({cart.length})
        </NavLink>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products" className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-3 outline-none focus:border-brand-500" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-stone-200 bg-white px-4 py-3 outline-none focus:border-brand-500">
          {categories.map((option) => <option value={option} key={option}>{option}</option>)}
        </select>
      </div>

      {loading ? <div>Loading products...</div> : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => (
            <div key={product.id} className="overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-sm">
              <ProductImage src={product.imageUrl} alt={product.name} className="h-52 w-full object-cover" />
              <div className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">{product.category}</span>
                  <span className="text-xs text-slate-500">{product.stock} in stock</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{product.name}</h3>
                  <p className="mt-2 text-sm text-slate-600">{product.description}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black text-brand-700">{formatCurrency(product.price)}</span>
                  <button disabled={product.stock < 1} onClick={() => addToCart(product)} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Add to cart</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CartPage({ labels, cart, setCart }) {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');

  const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  const sellerGroups = useMemo(() => {
    const groups = new Map();
    for (const item of cart) {
      const sellerId = item.entrepreneur?.entrepreneurProfile?.id || item.entrepreneurId;
      const sellerName = item.entrepreneur?.entrepreneurProfile?.businessName || 'Local seller';
      const group = groups.get(sellerId) || { sellerId, sellerName, items: [], subtotal: 0 };
      group.items.push(item);
      group.subtotal += Number(item.price) * item.quantity;
      groups.set(sellerId, group);
    }
    return [...groups.values()];
  }, [cart]);

  const updateQty = (id, delta) => {
    setCart((prev) => prev.flatMap((item) => item.id === id
      ? (item.quantity + delta <= 0 ? [] : [{ ...item, quantity: Math.min(item.stock, item.quantity + delta) }])
      : [item]));
  };

  const placeOrder = async () => {
    if (!token || !user) {
      setMessage('Please login to place an order.');
      return;
    }
    setProcessing(true);
    try {
      const items = cart.map((item) => ({ productId: item.id, quantity: item.quantity }));
      await api.createOrder({ items, shippingAddress, paymentMethod }, token);
      setCart([]);
      setMessage('Order placed successfully.');
      navigate('/orders');
    } catch (error) {
      setMessage(error.paymentStatus
        ? `Payment ${error.paymentStatus.toLowerCase()}: ${error.message}`
        : error.message || 'Unable to place order.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-4 rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Your cart</h2>
        {sellerGroups.length > 1 && <p className="text-sm text-slate-600">Items from different sellers will be placed as separate orders in one checkout.</p>}
        {sellerGroups.map((group) => (
          <div key={group.sellerId} className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
            {group.sellerName}: {group.items.length} {group.items.length === 1 ? 'item' : 'items'} · {formatCurrency(group.subtotal)}
          </div>
        ))}
        {cart.length === 0 ? <div className="rounded-xl bg-stone-100 p-5 text-slate-600">Your cart is empty. Browse the marketplace to add items.</div> : cart.map((item) => (
          <div key={item.id} className="flex flex-col gap-4 rounded-2xl border border-stone-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <ProductImage src={item.imageUrl} alt={item.name} className="h-16 w-16 rounded-xl object-cover" />
              <div>
                <div className="font-semibold text-slate-900">{item.name}</div>
                <div className="text-sm text-slate-500">{formatCurrency(item.price)}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => updateQty(item.id, -1)} className="rounded-lg bg-stone-100 px-2 py-1">-</button>
              <span className="w-6 text-center font-medium">{item.quantity}</span>
              <button disabled={item.quantity >= item.stock} onClick={() => updateQty(item.id, 1)} className="rounded-lg bg-stone-100 px-2 py-1 disabled:opacity-40">+</button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-xl font-bold text-slate-900">Checkout</h3>
        <div className="space-y-4">
          <textarea value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} placeholder="Delivery address" className="min-h-[110px] w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 outline-none focus:border-brand-500" />
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 outline-none focus:border-brand-500">
            <option value="COD">Cash on delivery</option>
            <option value="UPI">UPI</option>
          </select>
          <p className="text-xs text-slate-500">Academic prototype: UPI payment is simulated; cash on delivery remains pending.</p>
          <div className="rounded-xl bg-stone-50 p-4">
            <div className="flex justify-between text-sm text-slate-600"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="mt-2 flex justify-between text-lg font-bold text-slate-900"><span>Total</span><span>{formatCurrency(subtotal)}</span></div>
          </div>
          {message && <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{message}</div>}
          <button disabled={processing || cart.length === 0} onClick={placeOrder} className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white disabled:opacity-60">{processing ? 'Processing...' : 'Place order'}</button>
        </div>
      </div>
    </div>
  );
}

function OrdersPage({ labels }) {
  const { token, user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState('');

  const loadOrders = useCallback(async () => {
    if (!token) return;
    try {
      const response = await api.getOrders(token);
      setOrders(response.orders || []);
    } catch (error) {
      setMessage(error.message || 'Unable to load orders.');
    }
  }, [token]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const changeStatus = async (order, status) => {
    try {
      await api.updateOrderStatus(order.id, status, token);
      await loadOrders();
      setMessage('');
    } catch (error) {
      setMessage(error.message || 'Unable to update order.');
    }
  };

  const nextStatuses = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['DELIVERED'],
  };

  return (
    <div className="space-y-5">
      <h2 className="text-3xl font-bold text-slate-900">Recent orders</h2>
      {message && <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{message}</div>}
      {orders.length === 0 ? <div className="rounded-xl border border-stone-200 bg-white p-6 text-slate-600">No orders yet.</div> : orders.map((order) => (
        <div key={order.id} className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm text-slate-500">Order #{order.orderNumber}</div>
              <div className="text-xl font-bold text-slate-900">{formatCurrency(Number(order.totalAmount))}</div>
              <div className="text-sm text-slate-600">Seller: {order.entrepreneur?.businessName || 'Seller'}</div>
            </div>
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">{order.status}</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">Checkout reference: {order.checkoutGroupId}</div>
          <div className="mt-3 text-sm text-slate-600">Shipping to: {order.shippingAddress}</div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
            <span>Payment: {order.payment?.status || 'Not recorded'} ({order.payment?.method || order.paymentMethod})</span>
            <span>Delivery: {order.delivery?.status || 'Not available'}</span>
          </div>
          {user?.role === 'ENTREPRENEUR' && (
            <div className="mt-4 flex flex-wrap gap-2">
              {(nextStatuses[order.status] || []).map((status) => (
                <button key={status} onClick={() => changeStatus(order, status)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${status === 'CANCELLED' ? 'bg-red-50 text-red-700' : 'bg-brand-50 text-brand-700'}`}>
                  {status === 'CANCELLED' ? 'Cancel order' : `Mark ${status.toLowerCase()}`}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ProductsPage({ labels }) {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', price: '', category: 'Grains', stock: 0 });

  const loadProducts = async () => {
    const response = await api.getMyProducts(token);
    setProducts(response.products || []);
  };

  useEffect(() => {
    if (token) loadProducts();
  }, [token]);

  const addProduct = async () => {
    await api.createProduct({ ...form, price: Number(form.price), stock: Number(form.stock) }, token);
    setForm({ name: '', description: '', price: '', category: 'Grains', stock: 0 });
    loadProducts();
  };

  const removeProduct = async (id) => {
    await api.deleteProduct(id, token);
    loadProducts();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Add product</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Product name" className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2" />
          <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Category" className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2" />
          <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Price" className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2" />
          <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="Stock" className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2" />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="md:col-span-2 min-h-[100px] rounded-xl border border-stone-200 bg-stone-50 px-3 py-2" />
        </div>
        <button onClick={addProduct} className="mt-4 rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white">Save product</button>
      </div>

      <div className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900">Your products</h3>
        <div className="mt-4 space-y-3">
          {products.map((product) => (
            <div key={product.id} className="flex flex-col gap-3 rounded-2xl border border-stone-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-semibold text-slate-900">{product.name}</div>
                <div className="text-sm text-slate-500">{product.category} • {product.stock} in stock</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-brand-700">{formatCurrency(product.price)}</span>
                <button onClick={() => removeProduct(product.id)} className="rounded-lg bg-red-50 px-2.5 py-1.5 text-sm font-medium text-red-700">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InventoryPage({ labels }) {
  const { token } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => {
    const loadInventory = async () => {
      if (!token) return;
      const response = await api.getInventory(token);
      setItems(response.products || []);
    };
    loadInventory();
  }, [token]);

  const updateStock = async (productId, change) => {
    await api.adjustInventory({ productId, quantity: change, reason: 'Manual stock adjustment' }, token);
    const response = await api.getInventory(token);
    setItems(response.products || []);
  };

  return (
    <div className="space-y-5">
      <h2 className="text-3xl font-bold text-slate-900">Inventory management</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex flex-col gap-4 rounded-[1.5rem] border border-stone-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-semibold text-slate-900">{item.name}</div>
              <div className={`text-sm font-medium ${item.stock === 0 ? 'text-red-700' : item.stock <= 5 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {item.stock === 0 ? 'Out of stock' : item.stock <= 5 ? 'Low stock' : 'Available'} • {item.stock} units
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => updateStock(item.id, -1)} className="rounded-lg bg-stone-100 px-3 py-1.5 font-medium">-1</button>
              <button onClick={() => updateStock(item.id, 1)} className="rounded-lg bg-brand-600 px-3 py-1.5 font-medium text-white">+1</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsPage({ labels }) {
  const [data, setData] = useState([
    { name: 'Jan', value: 2000 },
    { name: 'Feb', value: 3200 },
    { name: 'Mar', value: 2400 },
    { name: 'Apr', value: 4000 },
    { name: 'May', value: 5000 },
  ]);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-slate-900">Business analytics</h2>
      <div className="grid gap-6 lg:grid-cols-3">
        <MetricCard title="Average order value" value={formatCurrency(2400)} icon={<IndianRupee className="h-5 w-5" />} />
        <MetricCard title="Best selling" value="Organic Rice" icon={<ShoppingBag className="h-5 w-5" />} />
        <MetricCard title="Low stock" value="3 products" icon={<Boxes className="h-5 w-5" />} />
      </div>

      <div className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
            <XAxis dataKey="name" stroke="#78716c" />
            <YAxis stroke="#78716c" />
            <Tooltip formatter={(value) => `₹${value}`} />
            <Bar dataKey="value" fill="#2e7d32" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SupportPage({ labels }) {
  const { token, user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadConversations = async () => {
      if (!token) return;
      const response = await api.getSupport(token);
      setConversations(response.conversations || []);
    };
    loadConversations();
  }, [token]);

  const submitQuery = async () => {
    if (!subject || !message) return;
    await api.createSupportConversation({ subject, message }, token);
    setSubject('');
    setMessage('');
    const response = await api.getSupport(token);
    setConversations(response.conversations || []);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Customer support</h2>
        <div className="mt-4 space-y-4">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Topic" className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2" />
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your issue" className="min-h-[120px] w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2" />
          <button onClick={submitQuery} className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white">Send message</button>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900">Recent conversations</h3>
        <div className="mt-4 space-y-3">
          {conversations.length === 0 ? <div className="text-slate-600">No active support conversations.</div> : conversations.map((conversation) => (
            <div key={conversation.id} className="rounded-2xl border border-stone-200 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-slate-900">{conversation.subject}</div>
                <span className="rounded-full bg-brand-50 px-2 py-1 text-xs text-brand-700">{conversation.status}</span>
              </div>
              <div className="mt-2 text-sm text-slate-500">{conversation.messages?.slice(-1)[0]?.content || 'No messages yet'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">{icon}</div>
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function MetricCard({ title, value, icon }) {
  return (
    <div className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">{title}</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">{icon}</div>
      </div>
    </div>
  );
}

function InfoPanel({ title, description, icon }) {
  return (
    <div className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">{icon}</div>
      <h3 className="text-xl font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  );
}

function Field({ label, type = 'text', value, onChange, select = false, options = [], className = '', }) {
  if (select) {
    return (
      <label className={`${className} block`}>
        <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
        <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 outline-none focus:border-brand-500">
          {options.map(([optionValue, optionLabel]) => (
            <option key={optionValue} value={optionValue}>{optionLabel}</option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className={`${className} block`}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 outline-none focus:border-brand-500" />
    </label>
  );
}

export default App;
