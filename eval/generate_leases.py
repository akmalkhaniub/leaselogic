import os
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def create_lease_pdf(filename, title, sections):
    # Ensure directory exists
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    
    doc = SimpleDocTemplate(filename, pagesize=letter,
                            rightMargin=54, leftMargin=54,
                            topMargin=54, bottomMargin=54)
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'LeaseTitle',
        parent=styles['Heading1'],
        fontSize=24,
        leading=28,
        spaceAfter=20,
        alignment=1 # Centered
    )
    
    heading_style = ParagraphStyle(
        'LeaseHeading',
        parent=styles['Heading2'],
        fontSize=12,
        leading=16,
        spaceBefore=14,
        spaceAfter=6,
        textColor='#8b5cf6' # Primary accent color
    )
    
    body_style = ParagraphStyle(
        'LeaseBody',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        spaceAfter=8
    )
    
    story = []
    
    # Title
    story.append(Paragraph(title, title_style))
    story.append(Spacer(1, 12))
    
    # Sections
    for heading, text in sections:
        if heading:
            story.append(Paragraph(heading, heading_style))
        story.append(Paragraph(text.replace('\n', '<br/>'), body_style))
        story.append(Spacer(1, 6))
        
    doc.build(story)
    print(f"Created PDF: {filename}")

def main():
    dest_dir = os.path.join(os.path.dirname(__file__), "..", "sample_leases")
    
    # 1. Oxford Street Lease
    oxford_sections = [
        (None, "This Office Lease Agreement (the \"Lease\") is entered into as of October 1, 2026, by and between Oxford Holdings Ltd (the \"Landlord\") and Apex Tech Solutions Inc (the \"Tenant\")."),
        ("SECTION 1. PARTIES & DEFINITIONS", 
         "The Landlord is Oxford Holdings Ltd, with registered offices at 50 City Road, London. The Tenant is Apex Tech Solutions Inc, currently located at 12 High Street, Reading."),
        ("SECTION 2. PREMISES", 
         "The Landlord hereby leases to the Tenant Suite 400 on the 4th floor of the building located at 100 Oxford Street, London (the \"Premises\")."),
        ("SECTION 3. TERM & DATES", 
         "The term of this Lease shall be for five (5) years, commencing on October 1, 2026 (the \"Commencement Date\") and expiring on September 30, 2031 (the \"Expiration Date\"), unless terminated earlier in accordance with Section 6."),
        ("SECTION 4. RENT PAYMENTS", 
         "The Tenant shall pay initial rent of £120,000 per annum, payable in equal monthly installments of £10,000 in advance on the first day of each calendar month. Payments shall be made by bank transfer to the Landlord's nominated account."),
        ("SECTION 5. RENT ESCALATION", 
         "On each anniversary of the Commencement Date, the annual rent shall increase by exactly 3.0% over the rent paid in the preceding year. The new rent schedule shall be calculated by the Landlord and notified to the Tenant 30 days prior."),
        ("SECTION 6. BREAK CLAUSE (EARLY TERMINATION)", 
         "The Tenant shall have a one-time option to terminate this Lease on September 30, 2029 (the \"Break Date\"), by giving the Landlord at least six (6) months' prior written notice. If the Tenant exercises this break option, it must pay all outstanding rent and yield up the Premises in accordance with Section 8."),
        ("SECTION 7. RENEWAL OPTIONS", 
         "The Tenant has the option to renew this Lease for a single further period of five (5) years. To exercise this renewal option, the Tenant must give written notice to the Landlord no later than nine (9) months prior to the Expiration Date. The rent during the renewal term shall be negotiated at open market value."),
        ("SECTION 8. MAINTENANCE & REPAIRS", 
         "The Tenant shall keep the interior of the Premises in good, clean, and tenantable repair, including carpets, painting, and light fixtures. The Landlord shall be responsible for structural repairs to the roof, load-bearing walls, and the exterior of the building, as well as common areas."),
        ("SECTION 9. INDEMNITY & INSURANCE", 
         "The Tenant shall indemnify and hold harmless the Landlord from and against all claims and liabilities arising from activities in the Premises. The Tenant must maintain public liability insurance of at least £5,000,000.")
    ]
    
    # 2. Regent Street Lease
    regent_sections = [
        (None, "This Office Lease Agreement is entered into as of January 1, 2027, by and between Regent Properties Corp (the \"Landlord\") and ByteSize Code Ltd (the \"Tenant\")."),
        ("SECTION 1. PARTIES & DEFINITIONS", 
         "The Landlord is Regent Properties Corp, with registered offices at 180 Regent Street, London. The Tenant is ByteSize Code Ltd, currently located at Suite B, 45 London Road, Croydon."),
        ("SECTION 2. PREMISES", 
         "The Landlord hereby leases to the Tenant the ground floor suite of the commercial building located at 220 Regent Street, London (the \"Premises\")."),
        ("SECTION 3. TERM & DATES", 
         "The term of this Lease shall be for five (5) years, commencing on January 1, 2027 (the \"Commencement Date\") and expiring on December 31, 2031 (the \"Expiration Date\"), unless terminated earlier in accordance with Section 6."),
        ("SECTION 4. RENT PAYMENTS", 
         "The Tenant shall pay initial rent of £80,000 per annum, payable in equal monthly installments of £6,666.67 in advance on the first day of each calendar month. Payments shall be made by bank transfer to the Landlord's nominated account."),
        ("SECTION 5. RENT ESCALATION", 
         "On each anniversary of the Commencement Date, the annual rent shall increase by exactly 2.5% over the rent paid in the preceding year. The new rent schedule shall be calculated by the Landlord and notified to the Tenant 30 days prior."),
        ("SECTION 6. BREAK CLAUSE (EARLY TERMINATION)", 
         "The Tenant shall have a one-time option to terminate this Lease on December 31, 2029 (the \"Break Date\"), by giving the Landlord at least six (6) months' prior written notice. If the Tenant exercises this break option, it must pay all outstanding rent and yield up the Premises in accordance with Section 8."),
        ("SECTION 7. RENEWAL OPTIONS", 
         "The Tenant has the option to renew this Lease for a single further period of five (5) years. To exercise this renewal option, the Tenant must give written notice to the Landlord no later than six (6) months prior to the Expiration Date. The rent during the renewal term shall be negotiated at open market value."),
        ("SECTION 8. MAINTENANCE & REPAIRS", 
         "The Tenant shall keep the interior of the Premises in good, clean, and tenantable repair. The Landlord shall be responsible for structural repairs to the roof, load-bearing walls, and the exterior of the building."),
        ("SECTION 9. INDEMNITY & INSURANCE", 
         "The Tenant shall indemnify and hold harmless the Landlord from and against all claims and liabilities. The Tenant must maintain public liability insurance of at least £2,000,000.")
    ]
    
    # 3. Bond Street Lease
    bond_sections = [
        (None, "This commercial property lease agreement is made on March 1, 2026, by and between Bond Estates LLC (the \"Landlord\") and Quantum AI Systems (the \"Tenant\")."),
        ("SECTION 1. PARTIES & DEFINITIONS", 
         "The Landlord is Bond Estates LLC, with registered offices at 12 Bond Street, London. The Tenant is Quantum AI Systems, currently located at Cambridge Science Park, Cambridge."),
        ("SECTION 2. PREMISES", 
         "The Landlord hereby leases to the Tenant the entire commercial block located at 15 Bond Street, London (the \"Premises\")."),
        ("SECTION 3. TERM & DATES", 
         "The term of this Lease shall be for ten (10) years, commencing on March 1, 2026 (the \"Commencement Date\") and expiring on February 28, 2036 (the \"Expiration Date\"). There are no early termination options in this lease."),
        ("SECTION 4. RENT PAYMENTS", 
         "The Tenant shall pay initial rent of £200,000 per annum, payable in equal monthly installments of £16,666.67 in advance on the first day of each calendar month. Payments shall be made by bank transfer to the Landlord's nominated account."),
        ("SECTION 5. RENT ESCALATION", 
         "On each anniversary of the Commencement Date, the annual rent shall increase by exactly 5.0% over the rent paid in the preceding year. The new rent schedule shall be calculated by the Landlord and notified to the Tenant 30 days prior."),
        ("SECTION 6. BREAK CLAUSE (EARLY TERMINATION)", 
         "This lease contains no break clause options. The Tenant is bound to the lease for the entire ten (10) year term."),
        ("SECTION 7. RENEWAL OPTIONS", 
         "The Tenant has the option to renew this Lease for a single further period of five (5) years. To exercise this renewal option, the Tenant must give written notice to the Landlord no later than twelve (12) months prior to the Expiration Date. The rent during the renewal term shall be negotiated at open market value."),
        ("SECTION 8. MAINTENANCE & REPAIRS", 
         "Unusually, the Landlord shall keep the interior of the Premises in good, clean, and tenantable repair. The Tenant shall be responsible for structural repairs to the roof, load-bearing walls, and the exterior of the building, as well as common areas."),
        ("SECTION 9. INDEMNITY & INSURANCE", 
         "The Tenant shall indemnify and hold harmless the Landlord from and against all claims and liabilities. The Tenant must maintain public liability insurance of at least £10,000,000.")
    ]

    create_lease_pdf(os.path.join(dest_dir, "Oxford_Street_Lease.pdf"), "OFFICE LEASE AGREEMENT", oxford_sections)
    create_lease_pdf(os.path.join(dest_dir, "Regent_Street_Lease.pdf"), "OFFICE LEASE AGREEMENT", regent_sections)
    create_lease_pdf(os.path.join(dest_dir, "Bond_Street_Lease.pdf"), "COMMERCIAL LEASE AGREEMENT", bond_sections)

if __name__ == "__main__":
    main()
