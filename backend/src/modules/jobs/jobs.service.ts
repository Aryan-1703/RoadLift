import { PrismaClient, JobStatus, ServiceType } from '@prisma/client';
import { MapsService } from '../../services/maps.service';
import { StripeService } from '../../services/stripe.service';
import { getIO } from '../../sockets/socketSetup'; // Assuming getIO is configured in your server

const prisma = new PrismaClient();

export class JobsService {
  
  /**
   * CUSTOMER: Request a new service
   */
  static async requestJob(customerId: string, data: any) {
    // 1. Calculate ETA and Distance via Google Maps Routes API
    // We mock the nearest driver location for estimation purposes here, 
    // or we query active drivers in the area.
    let distanceKm = 5.0; 
    let etaMinutes = 15;
    
    try {
      // Example of calling external service
      // const routes = await MapsService.getRoute(pickupCoords, closestDriverCoords);
      // distanceKm = routes.distance;
      // etaMinutes = routes.eta;
    } catch (e) {
      console.error('Google Maps API failed, using fallback estimates.');
    }

    // 2. Determine base price based on service type
    const basePrices: Record<ServiceType, number> = {
      TOWING: 85, TIRE: 45, LOCKOUT: 50, FUEL: 40, ACCIDENT: 120
    };
    const price = basePrices[data.serviceType as ServiceType] || 85;

    // 3. Create Job in DB
    const job = await prisma.job.create({
      data: {
        customerId,
        serviceType: data.serviceType,
        pickupLat: data.pickupLat,
        pickupLng: data.pickupLng,
        destinationLat: data.destinationLat,
        destinationLng: data.destinationLng,
        notes: data.notes,
        price,
        distanceKm,
        etaMinutes,
        status: JobStatus.REQUESTED
      }
    });

    // 4. Broadcast to available drivers in the area (or specific company)
    const io = getIO();
    // Emitting to a generalized driver room. In multi-tenant, emit to specific company.
    io.to('available-drivers').emit('new-job-request', job);

    return job;
  }

  /**
   * DRIVER: Accept a requested job.
   * Prevents race conditions using optimistic concurrency (updateMany with status check).
   */
  static async acceptJob(driverId: string, jobId: string) {
    // 1. Fetch driver details to get companyId
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: { user: true }
    });

    if (!driver) throw new Error('Driver not found');

    // 2. ATOMIC UPDATE to prevent double acceptance (Race Condition mitigation)
    const updateResult = await prisma.job.updateMany({
      where: { 
        id: jobId, 
        status: JobStatus.REQUESTED // ONLY update if it's still requested
      },
      data: { 
        status: JobStatus.ACCEPTED,
        driverId: driver.id,
        companyId: driver.companyId
      }
    });

    if (updateResult.count === 0) {
      throw new Error('Job has already been accepted by another driver or cancelled.');
    }

    // Fetch the updated job data
    const acceptedJob = await prisma.job.findUnique({ 
      where: { id: jobId },
      include: { customer: true }
    });

    // 3. Initialize Stripe PaymentIntent to secure funds (Auth only)
    const paymentIntent = await StripeService.createPaymentIntent(
      acceptedJob!.price, 
      acceptedJob!.customer.email
    );

    // Save payment intent to DB
    await prisma.payment.create({
      data: {
        jobId: acceptedJob!.id,
        amount: acceptedJob!.price,
        stripePaymentIntentId: paymentIntent.id
      }
    });

    // 4. Notify Customer via Socket
    const io = getIO();
    io.to(`customer-${acceptedJob!.customerId}`).emit('provider-assigned', {
      jobId: acceptedJob!.id,
      provider: {
        id: driver.id,
        name: driver.user.name,
        vehicle: driver.vehicleDetails,
        location: { latitude: driver.currentLat, longitude: driver.currentLng }
      }
    });

    return acceptedJob;
  }
}
