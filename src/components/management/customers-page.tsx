"use client";

import { useState, useMemo, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { tr } from "@/lib/translations";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  Calendar,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";

export function CustomersPage() {
  const lang = useAppStore((s) => s.lang);
  const services = useAppStore((s) => s.services);
  const addCustomer = useAppStore((s) => s.addCustomer);
  const updateCustomer = useAppStore((s) => s.updateCustomer);
  const deleteCustomer = useAppStore((s) => s.deleteCustomer);

  // إدارة العملاء محلياً لجلب فوري بالدفعات (Cursor / Limit)
  const [customerList, setCustomerList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    phoneNumber: "",
    passportNumber: "",
    nationalId: "",
    cardNumber: "",
    referralSource: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [formDirty, setFormDirty] = useState(false);

  // جلب أحدث 100 عميل فور فتح الصفحة في أقل من ثانية
  const fetchCustomers = async (cursorId?: string | null) => {
    try {
      if (cursorId) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const url = cursorId 
        ? `/api/customers?cursor=${cursorId}`
        : `/api/customers`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.ok && Array.isArray(data.customers)) {
        if (cursorId) {
          setCustomerList((prev) => [...prev, ...data.customers]);
        } else {
          setCustomerList(data.customers);
        }
        setNextCursor(data.nextCursor ?? null);
      } else if (Array.isArray(data)) {
        setCustomerList(data);
        setNextCursor(null);
      }
    } catch (err) {
      console.error("Failed to load customers:", err);
      toast.error(lang === "ar" ? "تعذر جلب بيانات العملاء" : "Failed to load customers");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const list = useMemo(() => {
    if (!search.trim()) return customerList;
    const q = search.toLowerCase();
    return customerList.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        (c.customerNumber && c.customerNumber.toLowerCase().includes(q)) ||
        (c.phoneNumber && c.phoneNumber.toLowerCase().includes(q)) ||
        (c.passportNumber ?? "").toLowerCase().includes(q)
    );
  }, [customerList, search]);

  const openCreate = () => {
    setForm({ fullName: "", phoneNumber: "", passportNumber: "", nationalId: "", cardNumber: "", referralSource: "" });
    setEditingId(null);
    setErrors({});
    setFormDirty(false);
    setOpen(true);
  };

  const openEdit = (c: any) => {
    setForm({
      fullName: c.fullName,
      phoneNumber: c.phoneNumber,
      passportNumber: c.passportNumber ?? "",
      nationalId: c.nationalId ?? "",
      cardNumber: c.cardNumber ?? "",
      referralSource: c.referralSource ?? "",
    });
    setEditingId(c.id);
    setErrors({});
    setFormDirty(false);
    setOpen(true);
  };

  const submit = async () => {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = lang === "ar" ? "مطلوب" : "Required";
    if (!form.phoneNumber.trim()) errs.phoneNumber = lang === "ar" ? "مطلوب" : "Required";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      if (editingId) {
        await updateCustomer(editingId, form);
        setCustomerList((prev) =>
          prev.map((c) => (c.id === editingId ? { ...c, ...form } : c))
        );
        toast.success(lang === "ar" ? "تم تحديث العميل" : "Customer updated");
      } else {
        const result = await addCustomer(form);
        if (result) {
          fetchCustomers(); // إعادة جلب فوري للظهور في الرأس
          toast.success(lang === "ar" ? "تم حفظ العميل" : "Customer saved");
        } else {
          toast.error(lang === "ar" ? "فشل حفظ العميل" : "Failed to save customer");
          setSaving(false);
          return;
        }
      }
      setOpen(false);
      setForm({ fullName: "", phoneNumber: "", passportNumber: "", nationalId: "", cardNumber: "", referralSource: "" });
      setEditingId(null);
      setFormDirty(false);
    } catch (err) {
      toast.error(lang === "ar" ? "حدث خطأ" : "An error occurred");
    }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteCustomer(deleteId);
      setCustomerList((prev) => prev.filter((c) => c.id !== deleteId));
      setDeleteId(null);
      toast.success(lang === "ar" ? "تم حذف العميل" : "Customer deleted");
    } catch (err) {
      toast.error(lang === "ar" ? "فشل الحذف" : "Failed to delete");
    }
  };

  const exportExcel = (period: "weekly" | "monthly" | "yearly") => {
    const url = `/api/export?type=customers&period=${period}&format=excel`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers_${period}_${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(lang === "ar" ? "تم تصدير ملف Excel" : "Excel file exported");
  };

  const exportPDF = (period: "weekly" | "monthly" | "yearly") => {
    const url = `/api/export?type=customers&period=${period}&format=pdf`;
    window.open(url, "_blank");
    toast.success(lang === "ar" ? "تم فتح تقرير PDF" : "PDF report opened");
  };

  const handleDialogChange = (open: boolean) => {
    if (!open && formDirty) {
      if (!window.confirm(lang === "ar" ? "لديك تغييرات غير محفوظة. هل تريد المغادرة؟" : "You have unsaved changes. Leave anyway?")) {
        return;
      }
    }
    setOpen(open);
    if (!open) {
      setForm({ fullName: "", phoneNumber: "", passportNumber: "", nationalId: "", cardNumber: "", referralSource: "" });
      setEditingId(null);
      setFormDirty(false);
    }
  };

  return (
    <div className="space-y-5" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{tr(lang, "nav_customers")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === "ar" ? `العملاء المعروضين: ${customerList.length}` : `Loaded customers: ${customerList.length}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* تصدير Excel */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-background gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                {tr(lang, "export_excel")}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={lang === "ar" ? "start" : "end"}>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => exportExcel("weekly")}>
                <Calendar className="w-4 h-4" />
                {tr(lang, "export_weekly")}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => exportExcel("monthly")}>
                <Calendar className="w-4 h-4" />
                {tr(lang, "export_monthly")}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => exportExcel("yearly")}>
                <Calendar className="w-4 h-4" />
                {lang === "ar" ? "تصدير سنوي" : "Yearly Export"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* تصدير PDF */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-background gap-2">
                <FileText className="w-4 h-4" />
                {tr(lang, "export_pdf")}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={lang === "ar" ? "start" : "end"}>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => exportPDF("weekly")}>
                <Calendar className="w-4 h-4" />
                {tr(lang, "export_weekly")}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => exportPDF("monthly")}>
                <Calendar className="w-4 h-4" />
                {tr(lang, "export_monthly")}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => exportPDF("yearly")}>
                <Calendar className="w-4 h-4" />
                {lang === "ar" ? "تصدير سنوي" : "Yearly Export"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:opacity-95 gap-2 shadow-sm"
            onClick={openCreate}
          >
            <Plus className="w-4 h-4" />
            {tr(lang, "add")}
          </Button>
        </div>
      </div>

      <Card className="border-border card-shadow">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === "ar" ? "بحث بالاسم، رقم العميل، الهاتف، الجواز..." : "Search by name, no., phone, passport..."}
              className="ps-9 h-10 bg-background"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border card-shadow">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>{tr(lang, "customer_name")}</TableHead>
                  <TableHead>{tr(lang, "phone")}</TableHead>
                  <TableHead>{tr(lang, "passport_number")}</TableHead>
                  <TableHead>{tr(lang, "customer_joined")}</TableHead>
                  <TableHead>{tr(lang, "customer_referral")}</TableHead>
                  <TableHead>{tr(lang, "status")}</TableHead>
                  <TableHead className="text-end">{tr(lang, "actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  /* مؤشر تحميل فوري يمنع إظهار رسالة "لا يوجد عملاء" */
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-sm font-medium">
                          {lang === "ar" ? "جاري تحميل بيانات العملاء بسرعة..." : "Loading customers..."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center">
                          <Plus className="w-6 h-6" />
                        </div>
                        <p className="text-sm">{tr(lang, "empty_customers")}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((c) => {
                    const custServices = services.filter((s) => s.customerId === c.id);
                    return (
                      <TableRow key={c.id} className="hover:bg-accent/30">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                              {c.fullName ? c.fullName.charAt(0) : "—"}
                            </div>
                            <div>
                              <div className="font-medium text-foreground text-sm">{c.fullName}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {custServices.length} {lang === "ar" ? "معاملة" : "transactions"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground num">{c.phoneNumber}</TableCell>
                        <TableCell className="text-sm text-muted-foreground num">{c.passportNumber ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground num">{c.joinedOn}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.referralSource ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={c.isActive ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"}>
                            {c.isActive ? tr(lang, "active") : tr(lang, "inactive")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-end">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" title={tr(lang, "delete_customer")} onClick={() => setDeleteId(c.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title={tr(lang, "edit_customer")} onClick={() => openEdit(c)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* زر تحميل الدفعة التالية بسلاسة عند الحاجة */}
          {nextCursor && !loading && (
            <div className="flex justify-center p-4 border-t border-border bg-muted/10">
              <Button
                variant="outline"
                onClick={() => fetchCustomers(nextCursor)}
                disabled={loadingMore}
                className="gap-2 text-sm shadow-sm"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {lang === "ar" ? "جاري جلب 100 عميل إضافي..." : "Loading more..."}
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    {lang === "ar" ? "تحميل المزيد (100 عميل)" : "Load More (100)"}
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog إضافة وتعديل العميل */}
      <Dialog open={open} onOpenChange={handleDialogChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingId ? tr(lang, "edit_customer") : tr(lang, "add")} — {tr(lang, "nav_customers")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{tr(lang, "f_customer_name")} *</Label>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="bg-background" />
              {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{tr(lang, "f_phone")} *</Label>
              <Input value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} className="bg-background" />
              {errors.phoneNumber && <p className="text-xs text-destructive">{errors.phoneNumber}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{tr(lang, "passport_number")}</Label>
              <Input value={form.passportNumber} onChange={(e) => setForm({ ...form, passportNumber: e.target.value })} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label>{tr(lang, "f_card_number")}</Label>
              <Input value={form.cardNumber} onChange={(e) => setForm({ ...form, cardNumber: e.target.value })} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label>{tr(lang, "customer_referral")}</Label>
              <Input value={form.referralSource} onChange={(e) => setForm({ ...form, referralSource: e.target.value })} className="bg-background" placeholder={lang === "ar" ? "توصية، إعلان..." : "Referral, ad..."} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => handleDialogChange(false)}>{tr(lang, "cancel")}</Button>
            <Button onClick={submit} disabled={saving} className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:opacity-95 gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {tr(lang, "save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* حوار تأكيد الحذف */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tr(lang, "delete_customer")}</AlertDialogTitle>
            <AlertDialogDescription>{tr(lang, "confirm_delete_customer")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tr(lang, "cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {tr(lang, "action_delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
