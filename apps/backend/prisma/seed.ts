import { PrismaClient, UserRole, ServiceCategory, BookingType, BookingStatus, PaymentStatus, ComplaintType, ComplaintStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Safety guard — never run on production
if (process.env.ENVIRONMENT === 'production') {
  console.error('SEED SCRIPT MUST NEVER RUN ON PRODUCTION. Aborting.');
  process.exit(1);
}

async function main(): Promise<void> {
  console.log('Seeding database...');

  // Clear all tables
  await prisma.escrowLedger.deleteMany();
  await prisma.loyaltyPlan.deleteMany();
  await prisma.jobBoardBid.deleteMany();
  await prisma.jobBoardRequest.deleteMany();
  await prisma.communityReply.deleteMany();
  await prisma.communityPost.deleteMany();
  await prisma.communityGroup.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.service.deleteMany();
  await prisma.providerBlockedDate.deleteMany();
  await prisma.providerSocietyMembership.deleteMany();
  await prisma.providerProfile.deleteMany();
  await prisma.tenantProfile.deleteMany();
  await prisma.society.deleteMany();
  await prisma.user.deleteMany();

  console.log('Tables cleared.');

  // =============================================
  // SOCIETIES
  // =============================================
  const societyPrestige = await prisma.society.create({
    data: {
      name: 'Prestige Whitefield',
      address: 'Whitefield Main Road, Whitefield',
      city: 'Bangalore',
      pincode: '560066',
      totalUnits: 500,
      isActive: true,
    },
  });

  const societyBrigade = await prisma.society.create({
    data: {
      name: 'Brigade Apartments',
      address: 'Sarjapur Road, Bellandur',
      city: 'Bangalore',
      pincode: '560103',
      totalUnits: 350,
      isActive: true,
    },
  });

  const societySobha = await prisma.society.create({
    data: {
      name: 'Sobha Heights',
      address: 'Marathahalli, Outer Ring Road',
      city: 'Bangalore',
      pincode: '560037',
      totalUnits: 400,
      isActive: true,
    },
  });

  console.log('Societies created.');

  // =============================================
  // ADMIN USERS (one per society)
  // =============================================
  const adminUser1 = await prisma.user.create({
    data: { phone: '+919999000003', role: UserRole.SOCIETY_ADMIN },
  });
  const adminUser2 = await prisma.user.create({
    data: { phone: '+919999000013', role: UserRole.SOCIETY_ADMIN },
  });
  const adminUser3 = await prisma.user.create({
    data: { phone: '+919999000023', role: UserRole.SOCIETY_ADMIN },
  });

  await prisma.society.update({ where: { id: societyPrestige.id }, data: { adminUserId: adminUser1.id } });
  await prisma.society.update({ where: { id: societyBrigade.id }, data: { adminUserId: adminUser2.id } });
  await prisma.society.update({ where: { id: societySobha.id }, data: { adminUserId: adminUser3.id } });

  // Super admin
  await prisma.user.create({
    data: { phone: '+919999000004', role: UserRole.SUPER_ADMIN },
  });

  console.log('Admin users created.');

  // =============================================
  // TENANT USERS (10 test accounts)
  // =============================================
  const tenantPhones = [
    '+919999000001', '+919999000005', '+919999000006', '+919999000007',
    '+919999000008', '+919999000009', '+919999000010', '+919999000011',
    '+919999000012', '+919999000014',
  ];

  const tenantUsers = await Promise.all(
    tenantPhones.map((phone) =>
      prisma.user.create({ data: { phone, role: UserRole.TENANT } }),
    ),
  );

  const tenantNames = [
    'Rahul Sharma', 'Priya Nair', 'Arjun Mehta', 'Divya Reddy',
    'Karthik Iyer', 'Ananya Gupta', 'Rohan Verma', 'Sneha Pillai',
    'Vikram Joshi', 'Meera Krishnan',
  ];

  const tenantProfiles = await Promise.all(
    tenantUsers.map((user, i) =>
      prisma.tenantProfile.create({
        data: {
          userId: user.id,
          societyId: i < 4 ? societyPrestige.id : i < 7 ? societyBrigade.id : societySobha.id,
          flatNumber: `A-${101 + i}`,
          fullName: tenantNames[i],
          approvalStatus: 'APPROVED',
          approvedAt: new Date(),
          approvedBy: adminUser1.id,
        },
      }),
    ),
  );

  console.log('Tenant profiles created.');

  // =============================================
  // PROVIDER USERS (8 test accounts)
  // =============================================
  const providerData = [
    { phone: '+919999000002', name: 'Lakshmi Devi', category: ServiceCategory.MAID, rate: 800 },
    { phone: '+919999000015', name: 'Sunita Kumari', category: ServiceCategory.MAID, rate: 900 },
    { phone: '+919999000016', name: 'Radha Bai', category: ServiceCategory.MAID, rate: 750 },
    { phone: '+919999000017', name: 'Raju Cook', category: ServiceCategory.COOK, rate: 1200 },
    { phone: '+919999000018', name: 'Shankar Chef', category: ServiceCategory.COOK, rate: 1500 },
    { phone: '+919999000019', name: 'Ramesh Electric', category: ServiceCategory.ELECTRICIAN, rate: 500 },
    { phone: '+919999000020', name: 'Suresh Carpenter', category: ServiceCategory.CARPENTER, rate: 600 },
    { phone: '+919999000021', name: 'Mahesh Plumber', category: ServiceCategory.PLUMBER, rate: 550 },
  ];

  const providerUsers = await Promise.all(
    providerData.map((p) =>
      prisma.user.create({ data: { phone: p.phone, role: UserRole.PROVIDER } }),
    ),
  );

  const providerProfiles = await Promise.all(
    providerUsers.map((user, i) =>
      prisma.providerProfile.create({
        data: {
          userId: user.id,
          fullName: providerData[i].name,
          serviceCategory: providerData[i].category,
          hourlyRate: providerData[i].rate,
          experienceYears: 2 + i,
          upiId: `${providerData[i].name.toLowerCase().replace(/\s/g, '')}@upi`,
          avgRating: 4.0 + (i % 5) * 0.2,
          totalReviews: 10 + i * 3,
        },
      }),
    ),
  );

  // Approve providers in Prestige Whitefield
  await Promise.all(
    providerProfiles.map((profile) =>
      prisma.providerSocietyMembership.create({
        data: {
          providerId: profile.id,
          societyId: societyPrestige.id,
          approvalStatus: 'APPROVED',
          approvedAt: new Date(),
          approvedBy: adminUser1.id,
          joinedAt: new Date(),
        },
      }),
    ),
  );

  console.log('Provider profiles created.');

  // =============================================
  // SERVICES (one per provider)
  // =============================================
  const serviceData = [
    { providerId: providerProfiles[0].id, category: ServiceCategory.MAID,        title: 'Daily Cleaning',                   description: 'Full home cleaning service',          price: 800,  monthlyPrice: 6000,  trialPrice: 250,  schedule: { daysPerWeek: 6, timeSlot: '08:00-10:00' }, durationMinutes: 120 },
    { providerId: providerProfiles[1].id, category: ServiceCategory.MAID,        title: 'Daily Cleaning',                   description: 'Full home cleaning service',          price: 900,  monthlyPrice: 7000,  trialPrice: 300,  schedule: { daysPerWeek: 6, timeSlot: '09:00-11:00' }, durationMinutes: 120 },
    { providerId: providerProfiles[2].id, category: ServiceCategory.MAID,        title: 'Daily Cleaning',                   description: 'Full home cleaning service',          price: 750,  monthlyPrice: 5500,  trialPrice: 200,  schedule: { daysPerWeek: 6, timeSlot: '07:00-09:00' }, durationMinutes: 120 },
    { providerId: providerProfiles[3].id, category: ServiceCategory.COOK,        title: 'South Indian Breakfast & Lunch',   description: '2 meals per day',                     price: 1200, monthlyPrice: 8000,  trialPrice: 300,  schedule: { daysPerWeek: 6, timeSlot: '07:00-08:00' }, durationMinutes: 90  },
    { providerId: providerProfiles[4].id, category: ServiceCategory.COOK,        title: 'Full Day Cooking',                 description: 'Breakfast, lunch & dinner',           price: 1500, monthlyPrice: 12000, trialPrice: 500,  schedule: { daysPerWeek: 6, timeSlot: '06:30-08:30' }, durationMinutes: 120 },
    { providerId: providerProfiles[5].id, category: ServiceCategory.ELECTRICIAN, title: 'Electrical Repair',                description: 'General electrical repairs',          price: 500,  durationMinutes: 60  },
    { providerId: providerProfiles[6].id, category: ServiceCategory.CARPENTER,   title: 'Carpentry Work',                   description: 'Furniture repair & installation',     price: 600,  durationMinutes: 60  },
    { providerId: providerProfiles[7].id, category: ServiceCategory.PLUMBER,     title: 'Plumbing Repair',                  description: 'Pipe & fixture repairs',              price: 550,  durationMinutes: 60  },
  ];

  const services = await Promise.all(
    serviceData.map((s) => prisma.service.create({ data: s })),
  );

  console.log('Services created.');

  // =============================================
  // BOOKINGS (20 in various states)
  // =============================================
  const bookingStates: Array<{ status: BookingStatus; completedAt?: Date }> = [
    { status: BookingStatus.PENDING },
    { status: BookingStatus.PENDING },
    { status: BookingStatus.CONFIRMED },
    { status: BookingStatus.CONFIRMED },
    { status: BookingStatus.CONFIRMED },
    { status: BookingStatus.COMPLETED, completedAt: new Date() },
    { status: BookingStatus.COMPLETED, completedAt: new Date() },
    { status: BookingStatus.COMPLETED, completedAt: new Date() },
    { status: BookingStatus.COMPLETED, completedAt: new Date() },
    { status: BookingStatus.COMPLETED, completedAt: new Date() },
    { status: BookingStatus.COMPLETED, completedAt: new Date() },
    { status: BookingStatus.COMPLETED, completedAt: new Date() },
    { status: BookingStatus.COMPLETED, completedAt: new Date() },
    { status: BookingStatus.CANCELLED },
    { status: BookingStatus.CANCELLED },
    { status: BookingStatus.AUTO_CANCELLED },
    { status: BookingStatus.COMPLETED, completedAt: new Date() },
    { status: BookingStatus.COMPLETED, completedAt: new Date() },
    { status: BookingStatus.CONFIRMED },
    { status: BookingStatus.PENDING },
  ];

  const bookings = await Promise.all(
    bookingStates.map((state, i) =>
      prisma.booking.create({
        data: {
          tenantId: tenantProfiles[i % tenantProfiles.length].id,
          providerId: providerProfiles[i % 3].id,
          serviceId: services[i % services.length].id,
          societyId: societyPrestige.id,
          bookingType: BookingType.ONE_TIME,
          status: state.status,
          scheduledAt: new Date(Date.now() + (i - 10) * 24 * 60 * 60 * 1000),
          completedAt: state.completedAt,
          workerPrice: 800,
          platformFee: 99,
          totalAmount: 899,
        },
      }),
    ),
  );

  console.log('Bookings created.');

  // =============================================
  // REVIEWS (10 on completed bookings)
  // =============================================
  const completedBookings = bookings.filter((b) => b.status === BookingStatus.COMPLETED);
  await Promise.all(
    completedBookings.slice(0, 10).map((booking, i) =>
      prisma.review.create({
        data: {
          bookingId: booking.id,
          tenantId: booking.tenantId,
          providerId: booking.providerId,
          rating: 3 + (i % 3),
          comment: ['Great service!', 'Very punctual.', 'Good work.', 'Would recommend.', 'Satisfied.'][i % 5],
        },
      }),
    ),
  );

  console.log('Reviews created.');

  // =============================================
  // COMPLAINTS (5 sample)
  // =============================================
  await prisma.complaint.create({
    data: {
      bookingId: bookings[13].id,
      tenantId: tenantProfiles[0].id,
      providerId: providerProfiles[0].id,
      type: ComplaintType.SERVICE,
      status: ComplaintStatus.OPEN,
      description: 'Provider did not show up for the scheduled booking.',
    },
  });

  await prisma.complaint.create({
    data: {
      bookingId: bookings[14].id,
      tenantId: tenantProfiles[1].id,
      providerId: providerProfiles[1].id,
      type: ComplaintType.PAYMENT,
      status: ComplaintStatus.IN_REVIEW,
      description: 'Charged more than agreed amount.',
    },
  });

  await prisma.complaint.create({
    data: {
      tenantId: tenantProfiles[2].id,
      providerId: providerProfiles[2].id,
      type: ComplaintType.SAFETY,
      status: ComplaintStatus.RESOLVED,
      description: 'Unverified person entered the society claiming to be a worker.',
      resolution: 'Admin verified and warned the provider.',
      resolvedAt: new Date(),
    },
  });

  await prisma.complaint.create({
    data: {
      bookingId: bookings[5].id,
      tenantId: tenantProfiles[3].id,
      providerId: providerProfiles[0].id,
      type: ComplaintType.SERVICE,
      status: ComplaintStatus.CLOSED,
      description: 'Work quality was not satisfactory.',
      resolution: 'Partial refund issued.',
      resolvedAt: new Date(),
    },
  });

  await prisma.complaint.create({
    data: {
      tenantId: tenantProfiles[4].id,
      providerId: providerProfiles[1].id,
      type: ComplaintType.SAFETY,
      status: ComplaintStatus.OPEN,
      description: 'Provider behaving inappropriately in common areas.',
    },
  });

  console.log('Complaints created.');
  console.log('\n✅ Seed complete!');
  console.log('\nTest accounts:');
  console.log('  Tenant:                 +91 9999000001  OTP: 123456');
  console.log('  Provider:               +91 9999000002  OTP: 123456');
  console.log('  Admin (Prestige):       +91 9999000003  OTP: 123456');
  console.log('  Super Admin:            +91 9999000004  OTP: 123456');
  console.log('  Admin (Brigade):        +91 9999000013  OTP: 123456');
  console.log('  Admin (Sobha):          +91 9999000023  OTP: 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
