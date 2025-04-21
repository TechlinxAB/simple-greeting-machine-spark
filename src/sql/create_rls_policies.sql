
-- PROFILES POLICIES
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

-- CLIENTS POLICIES
CREATE POLICY "Authenticated users can view all clients" 
  ON public.clients 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert clients" 
  ON public.clients 
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins and managers can update clients" 
  ON public.clients 
  FOR UPDATE 
  USING (public.is_admin_or_manager());

CREATE POLICY "Admins can delete clients" 
  ON public.clients 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- PRODUCTS POLICIES
CREATE POLICY "Authenticated users can view all products" 
  ON public.products 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert products" 
  ON public.products 
  FOR INSERT 
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "Admins and managers can update products" 
  ON public.products 
  FOR UPDATE 
  USING (public.is_admin_or_manager());

CREATE POLICY "Admins can delete products" 
  ON public.products 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- TIME ENTRIES POLICIES
CREATE POLICY "Users can view their own time entries" 
  ON public.time_entries 
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins and managers can view all time entries" 
  ON public.time_entries 
  FOR SELECT 
  USING (public.is_admin_or_manager());

CREATE POLICY "Users can insert their own time entries" 
  ON public.time_entries 
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time entries" 
  ON public.time_entries 
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins and managers can update all time entries" 
  ON public.time_entries 
  FOR UPDATE 
  USING (public.is_admin_or_manager());

CREATE POLICY "Users can delete their own time entries" 
  ON public.time_entries 
  FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any time entry" 
  ON public.time_entries 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- USER TIMERS POLICIES
CREATE POLICY "Users can view their own timers" 
  ON public.user_timers 
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own timers" 
  ON public.user_timers 
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timers" 
  ON public.user_timers 
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own timers" 
  ON public.user_timers 
  FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

-- INVOICES POLICIES
CREATE POLICY "Authenticated users can view all invoices" 
  ON public.invoices 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert invoices" 
  ON public.invoices 
  FOR INSERT 
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "Admins and managers can update invoices" 
  ON public.invoices 
  FOR UPDATE 
  USING (public.is_admin_or_manager());

CREATE POLICY "Admins can delete invoices" 
  ON public.invoices 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- INVOICE ITEMS POLICIES
CREATE POLICY "Authenticated users can view all invoice items" 
  ON public.invoice_items 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert invoice items" 
  ON public.invoice_items 
  FOR INSERT 
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "Admins and managers can update invoice items" 
  ON public.invoice_items 
  FOR UPDATE 
  USING (public.is_admin_or_manager());

CREATE POLICY "Admins can delete invoice items" 
  ON public.invoice_items 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
